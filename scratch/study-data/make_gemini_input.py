"""Write Gadhada I source text into paste/upload-sized files: gemini-input/batch-NN.txt"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(H, '..', '..', 'www', 'assets', 'data')
O = os.path.join(H, 'gemini-input'); os.makedirs(O, exist_ok=True)
def blk(i):
    g = json.load(open(f'{D}/gujarati/vachanamrut-{i}.json', encoding='utf-8'))
    e = json.load(open(f'{D}/english/vachanamrut-{i}.json', encoding='utf-8'))
    t = e['text'][:len(e['text']) // 2]
    return f"=== VACHANAMRUT id={i} ===\n--- GUJARATI ---\n{g['vachanamrut'].strip()} | {g['title'].strip()}\n{g['setting']}\n{g['text']}\n--- ENGLISH ---\n{e['vachanamrut']} | {e['title']}\n{e['setting']}\n{t}\n"
b, cur, n = [], [], 0
for i in range(1, 79):
    x = blk(i)
    if cur and (n + len(x) > 26000 or len(cur) == 5): b.append(cur); cur, n = [], 0
    cur.append((i, x)); n += len(x)
b.append(cur)
for k, c in enumerate(b, 1):
    open(f'{O}/batch-{k:02d}.txt', 'w', encoding='utf-8').write('\n'.join(x for _, x in c))
    print(f'batch-{k:02d}', c[0][0], '-', c[-1][0])
