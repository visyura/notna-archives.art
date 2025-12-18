#!/usr/bin/env python3
import random
from collections import Counter

VALUES = ['A', 'K', 'Q', 'J'] + [str(n) for n in range(10, 1, -1)]
VALUE_CHIPS = {'A':11,'K':10,'Q':10,'J':10,'10':10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2}
SUITS = ['♥', '♠', '♦', '♣']
SUIT_COLORS = {'♥': 31, '♠': 94, '♦': 91, '♣': 36}
YELLOW = "\033[33m"
RESET = "\033[0m"

POKER_HANDS = {
    "High Card": (5,1),
    "Pair": (10,2),
    "Two Pair": (20,2),
    "Three of a Kind": (30,3),
    "Straight": (30,4),
    "Flush": (35,4),
    "Full House": (40,4),
    "Four of a Kind": (60,7),
    "Straight Flush": (100,8),
    "Royal Flush": (100,8),
    "Five of a Kind": (120,12),
    "Flush House": (140,14)
}

MAX_HANDS = 4
MAX_DISCARD_TURNS = 4

ANTE_REQUIREMENTS = {
    0:100,1:300,2:800,3:2000,4:5000,5:11000,6:20000,7:35000,
    8:50000,9:110000,10:560000,11:7200000,12:300000000,13:47000000000,
    14:2.9e13,15:7.7e16,16:8.6e20,17:4.2e25,18:9.2e30,19:9.2e36,20:4.3e43,
    21:9.7e50,22:1.0e59,23:5.8e67,24:1.6e77,25:2.4e87,26:1.9e98,27:8.4e109,
    28:2.0e122,29:2.7e135,30:2.1e149,31:9.9e163,32:2.7e179,33:4.4e195,
    34:4.4e212,35:2.8e230,36:1.1e249,37:2.7e268,38:4.5e288,39:float('inf')
}

BLIND_REWARDS = {"Small blind":3,"Big blind":4,"Boss blind":5}

def create_deck():
    return [f"{v}{s}" for s in SUITS for v in VALUES]

def sort_hand(hand):
    order = {v:i for i,v in enumerate(VALUES)}
    return sorted(hand, key=lambda c: order[c[:-1]])

def display_hand(hand):
    for idx, c in enumerate(hand, start=1):
        fg = SUIT_COLORS.get(c[-1], 37)
        print(f"\033[90m{idx} \033[0m\033[{fg}m{c}\033[0m", end=' ')
    print()

def display_state(hand, hands_left, discards_left, round_score, req, deck_len, total_money):
    print(f"Round score: {round_score}/{req} | Cards left: {deck_len}/52")
    print(f"Hands left: {hands_left} | Discards left: {discards_left} | {YELLOW}${total_money}{RESET}")
    display_hand(hand)

def draw_cards(deck, n):
    drawn = deck[:n]
    del deck[:n]
    return drawn

def discard(hand, deck, indices, discards_left):
    if discards_left<=0: return 0
    for i in sorted(indices, reverse=True): del hand[i]
    new_cards = draw_cards(deck,min(len(indices), len(deck)))
    hand.extend(new_cards)
    hand[:] = sort_hand(hand)
    return 1

def card_value_chips(card):
    return VALUE_CHIPS.get(card[:-1],0)

def rank_to_num(rank):
    order = {v:i for i,v in enumerate(VALUES[::-1],2)}
    return order.get(rank,0)

def is_straight(ranks):
    nums = sorted(set(rank_to_num(r) for r in ranks))
    if len(nums)<5: return False
    for i in range(len(nums)-4):
        if nums[i+4]-nums[i]==4: return True
    low_nums = [1 if r=='A' else rank_to_num(r) for r in ranks]
    low_nums.sort()
    for i in range(len(low_nums)-4):
        if low_nums[i+4]-low_nums[i]==4: return True
    return False

def poker_hand(cards):
    ranks = [c[:-1] for c in cards]
    suits = [c[-1] for c in cards]
    count = Counter(ranks)
    suit_count = Counter(suits)
    if 5 in count.values() and len(set(suits))>1: return "Five of a Kind"
    if 3 in count.values() and 2 in count.values() and len(suit_count)==1: return "Flush House"
    if len(cards)>=5:
        for s in set(suits):
            suit_cards = [c for c in cards if c[-1]==s]
            if len(suit_cards)>=5 and is_straight([c[:-1] for c in suit_cards]):
                if set(['A','K','Q','J','10']).issubset([c[:-1] for c in suit_cards]): return "Royal Flush"
                return "Straight Flush"
    if 4 in count.values(): return "Four of a Kind"
    if 3 in count.values() and 2 in count.values(): return "Full House"
    if max(suit_count.values())>=5: return "Flush"
    if is_straight(ranks): return "Straight"
    if 3 in count.values(): return "Three of a Kind"
    if list(count.values()).count(2)==2: return "Two Pair"
    if 2 in count.values(): return "Pair"
    return "High Card"

def get_triggered_cards(played):
    ranks = [c[:-1] for c in played]
    count = Counter(ranks)
    hand_type = poker_hand(played)
    if hand_type=="Pair":
        r = [rk for rk,v in count.items() if v==2][0]; triggered = [c for c in played if c[:-1]==r]
    elif hand_type=="Two Pair":
        rks = [rk for rk,v in count.items() if v==2]; triggered = [c for c in played if c[:-1] in rks]
    elif hand_type=="Three of a Kind":
        r = [rk for rk,v in count.items() if v==3][0]; triggered = [c for c in played if c[:-1]==r]
    elif hand_type=="Four of a Kind":
        r = [rk for rk,v in count.items() if v==4][0]; triggered = [c for c in played if c[:-1]==r]
    elif hand_type=="High Card":
        highest = max(played, key=lambda c: rank_to_num(c[:-1])); triggered = [highest]
    else: triggered = played
    return triggered, hand_type

def play(hand, deck, indices):
    played = [hand[i] for i in indices]
    for i in sorted(indices, reverse=True): del hand[i]
    new_cards = draw_cards(deck,min(len(indices), len(deck)))
    hand.extend(new_cards)
    hand[:] = sort_hand(hand)
    triggered, hand_name = get_triggered_cards(played)
    base_chips, mult = POKER_HANDS.get(hand_name,(0,1))
    chip_total = sum(card_value_chips(c) for c in triggered)
    total_score = (base_chips + chip_total)*mult
    print(f"Played {hand_name}: {' '.join(played)} | Hand score: {total_score}")
    return total_score

def play_blind(ante_level):
    base_req = ANTE_REQUIREMENTS.get(ante_level,100)
    blinds = [("Small blind", base_req), ("Big blind", int(base_req*1.5)), ("Boss blind", base_req*2)]
    total_money = 0
    for name, req in blinds:
        print(f"\n{name} : {req}")
        deck = create_deck()
        random.shuffle(deck)
        hand = sort_hand(draw_cards(deck,8))
        round_score = 0
        mode = "play"
        hands_left = MAX_HANDS
        discards_left = MAX_DISCARD_TURNS

        display_state(hand, hands_left, discards_left, round_score, req, len(deck), total_money)

        while True:
            if round_score >= req:
                blind_reward = BLIND_REWARDS.get(name,0)
                hand_bonus = hands_left
                interest = min(total_money // 5, 5)
                total_gain = blind_reward + hand_bonus + interest
                total_money += total_gain
                print(f" Cash Out: {YELLOW}${total_money}{RESET}")
                print(f" - Blind Reward: ${blind_reward}")
                print(f" - Remaining Hands: ${hand_bonus}")
                if interest > 0:
                    print(f" - Interest: ${interest}")
                break

            if hands_left == 0 and round_score < req:
                print(f"You lost the {name}. Score: {round_score}/{req}")
                restart = input("restart> ").strip().lower()
                if restart == "y":
                    return play_blind(ante_level)
                else:
                    exit()

            prompt = "play>" if mode=="play" else "discard>"
            cmd = input(prompt).strip().lower()
            if cmd in ["p","play"]:
                mode="play"
                continue
            if cmd in ["d","discard"]:
                mode="discard"
                continue
            if not cmd.isdigit(): continue
            indices = [int(ch)-1 for ch in cmd if 1<=int(ch)<=len(hand)]
            if not indices: continue

            if mode=="discard" and discards_left>0:
                used = discard(hand,deck,indices, discards_left)
                discards_left -= used
            elif mode=="play" and hands_left>0:
                score = play(hand,deck,indices)
                round_score += score
                hands_left -= 1

            display_state(hand, hands_left, discards_left, round_score, req, len(deck), total_money)

def main():
    play_blind(1)

if __name__=="__main__":
    main()
