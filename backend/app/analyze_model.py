"""
Model Analyzer Script
Run from your project root:
    python analyze_model.py
"""

import os
import sys
import torch

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'isl_model'))
SAFETENSORS_PATH = os.path.join(MODEL_PATH, "model.safetensors")

print("=" * 60)
print("MODEL DIRECTORY CONTENTS")
print("=" * 60)
if os.path.exists(MODEL_PATH):
    for f in os.listdir(MODEL_PATH):
        size = os.path.getsize(os.path.join(MODEL_PATH, f))
        print(f"  {f}  ({size / 1024:.1f} KB)")
else:
    print(f"❌ Directory not found: {MODEL_PATH}")
    sys.exit(1)

print()
print("=" * 60)
print("RAW load_file() INSPECTION")
print("=" * 60)
try:
    from safetensors.torch import load_file
    raw = load_file(SAFETENSORS_PATH)
    print(f"Type : {type(raw)}")

    if isinstance(raw, dict):
        print(f"Keys : {len(raw)}")
        print(f"Sample keys: {list(raw.keys())[:5]}")
        for k, v in list(raw.items())[:3]:
            print(f"  [{k}] shape={v.shape}, dtype={v.dtype}")

    elif isinstance(raw, list):
        print(f"Length of list : {len(raw)}")
        for i, item in enumerate(raw[:5]):
            print(f"  item[{i}] type={type(item)}", end="")
            if isinstance(item, dict):
                print(f"  keys={list(item.keys())[:3]}")
            elif isinstance(item, torch.Tensor):
                print(f"  shape={item.shape}, dtype={item.dtype}")
            else:
                print(f"  value={str(item)[:100]}")
    else:
        print(f"⚠️ Unexpected type: {type(raw)}")
        print(f"Value preview: {str(raw)[:300]}")

except Exception as e:
    print(f"❌ load_file() failed: {e}")

print()
print("=" * 60)
print("SAFETENSORS METADATA (raw header)")
print("=" * 60)
try:
    from safetensors import safe_open
    with safe_open(SAFETENSORS_PATH, framework="pt") as f:
        meta = f.metadata()
        keys = list(f.keys())
    print(f"Metadata : {meta}")
    print(f"Total tensors : {len(keys)}")
    print(f"First 5 keys  : {keys[:5]}")
    print(f"Last 5 keys   : {keys[-5:]}")
except Exception as e:
    print(f"❌ safe_open() failed: {e}")

print()
print("=" * 60)
print("TOKENIZER CHECK")
print("=" * 60)
try:
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, legacy=False)
    print(f"✅ Tokenizer loaded")
    print(f"   Vocab size : {tokenizer.vocab_size}")
    test = tokenizer("translate English to ISL: I am fine", return_tensors="pt")
    print(f"   Test encode: {test['input_ids'].shape}")
except Exception as e:
    print(f"❌ Tokenizer failed: {e}")

print()
print("=" * 60)
print("BASE MODEL (t5-small) KEY COMPARISON")
print("=" * 60)
try:
    from transformers import AutoModelForSeq2SeqLM
    from safetensors import safe_open

    base = AutoModelForSeq2SeqLM.from_pretrained("t5-small")
    base_keys = set(base.state_dict().keys())

    with safe_open(SAFETENSORS_PATH, framework="pt") as f:
        file_keys = set(f.keys())

    missing  = base_keys - file_keys
    extra    = file_keys - base_keys
    matched  = base_keys & file_keys

    print(f"Base model keys  : {len(base_keys)}")
    print(f"File keys        : {len(file_keys)}")
    print(f"✅ Matched        : {len(matched)}")
    print(f"⚠️  Missing in file: {len(missing)}")
    if missing:
        print(f"   Sample missing : {list(missing)[:5]}")
    print(f"⚠️  Extra in file  : {len(extra)}")
    if extra:
        print(f"   Sample extra   : {list(extra)[:5]}")

except Exception as e:
    print(f"❌ Comparison failed: {e}")

print()
print("=" * 60)
print("DONE — paste the full output above when sharing results")
print("=" * 60)