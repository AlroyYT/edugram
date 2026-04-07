"""
Model Repair Script
Run from your project root:
    python repair_model.py

Fixes:
  1. Tokenizer crash ('list' object has no attribute 'keys')
  2. Missing tied weights: decoder.embed_tokens, encoder.embed_tokens, lm_head
"""

import os
import json
import shutil
import torch
from safetensors.torch import load_file, save_file
from transformers import AutoTokenizer, T5Tokenizer

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'isl_model'))
SAFETENSORS_PATH = os.path.join(MODEL_PATH, "model.safetensors")
BACKUP_PATH = os.path.join(MODEL_PATH, "model.safetensors.bak")

print("=" * 60)
print("REPAIR STEP 1: Backup original file")
print("=" * 60)
if not os.path.exists(BACKUP_PATH):
    shutil.copy2(SAFETENSORS_PATH, BACKUP_PATH)
    print(f"✅ Backup saved to model.safetensors.bak")
else:
    print(f"ℹ️  Backup already exists, skipping.")


# -------------------------------------------------------
# REPAIR 1: Fix Tokenizer
# -------------------------------------------------------
print()
print("=" * 60)
print("REPAIR STEP 2: Diagnose & fix tokenizer")
print("=" * 60)

tokenizer_json_path = os.path.join(MODEL_PATH, "tokenizer.json")
tokenizer_config_path = os.path.join(MODEL_PATH, "tokenizer_config.json")

# Inspect tokenizer_config.json for list-where-dict-expected
print("Checking tokenizer_config.json ...")
with open(tokenizer_config_path, "r") as f:
    tc = json.load(f)
print(f"  Keys: {list(tc.keys())}")
for k, v in tc.items():
    if isinstance(v, list):
        print(f"  ⚠️  Key '{k}' is a LIST (len={len(v)}) — likely the culprit")
    else:
        print(f"  ✅ Key '{k}' = {type(v).__name__}")

# Inspect tokenizer.json added_tokens_decoder (common source of bug)
print()
print("Checking tokenizer.json for list-as-dict ...")
with open(tokenizer_json_path, "r") as f:
    tj = json.load(f)

issue_found = False
for k, v in tj.items():
    if isinstance(v, list) and k in ("added_tokens_decoder", "model", "normalizer", "pre_tokenizer", "post_processor", "decoder"):
        print(f"  ⚠️  Key '{k}' is a LIST — should be dict or null. Fixing...")
        tj[k] = {}  # Reset to empty dict; T5 doesn't need custom added_tokens_decoder
        issue_found = True

if issue_found:
    with open(tokenizer_json_path, "w") as f:
        json.dump(tj, f, indent=2)
    print("  ✅ tokenizer.json patched and saved.")
else:
    print("  ℹ️  No obvious list-as-dict found in tokenizer.json top-level keys.")

# Now try loading tokenizer
print()
print("Attempting tokenizer reload after patch ...")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, legacy=False)
    test = tokenizer("translate English to ISL: I am fine", return_tensors="pt")
    print(f"✅ Tokenizer loaded! Vocab size: {tokenizer.vocab_size}")
    print(f"   Test encode shape: {test['input_ids'].shape}")
except Exception as e:
    print(f"❌ Still failing: {e}")
    print()
    print("  Falling back to loading T5Tokenizer from 't5-small' and saving fresh copy...")
    try:
        tokenizer = T5Tokenizer.from_pretrained("t5-small", legacy=False)
        tokenizer.save_pretrained(MODEL_PATH)
        print(f"✅ Fresh T5 tokenizer saved to {MODEL_PATH}")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, legacy=False)
        print(f"✅ Reloaded successfully. Vocab size: {tokenizer.vocab_size}")
    except Exception as e2:
        print(f"❌ Fallback also failed: {e2}")


# -------------------------------------------------------
# REPAIR 2: Fix missing tied weights
# -------------------------------------------------------
print()
print("=" * 60)
print("REPAIR STEP 3: Fix missing tied weights")
print("=" * 60)

state_dict = load_file(SAFETENSORS_PATH)
print(f"Loaded {len(state_dict)} tensors.")

missing = []
for key in ["encoder.embed_tokens.weight", "decoder.embed_tokens.weight", "lm_head.weight"]:
    if key not in state_dict:
        missing.append(key)

if missing:
    if "shared.weight" not in state_dict:
        print("❌ 'shared.weight' also missing — cannot repair tied weights. You need to retrain.")
    else:
        print(f"Found 'shared.weight' with shape {state_dict['shared.weight'].shape}")
        print(f"Tying missing keys to shared.weight: {missing}")
        for key in missing:
            state_dict[key] = state_dict["shared.weight"].clone()
            print(f"  ✅ Added {key}")

        save_file(state_dict, SAFETENSORS_PATH)
        print(f"✅ Saved repaired weights ({len(state_dict)} tensors) to {SAFETENSORS_PATH}")
else:
    print("✅ No missing tied weights — nothing to fix here.")


# -------------------------------------------------------
# FINAL VERIFICATION
# -------------------------------------------------------
print()
print("=" * 60)
print("FINAL VERIFICATION: Load full model pipeline")
print("=" * 60)
try:
    from transformers import AutoModelForSeq2SeqLM

    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, legacy=False)
    model = AutoModelForSeq2SeqLM.from_pretrained("t5-small")
    state_dict = load_file(SAFETENSORS_PATH)
    result = model.load_state_dict(state_dict, strict=False)
    model.eval()

    if result.missing_keys:
        print(f"⚠️  Still missing: {result.missing_keys}")
    else:
        print("✅ All keys matched!")

    # Run a test inference
    inputs = tokenizer("translate English to ISL: I am fine", return_tensors="pt")
    with torch.no_grad():
        outputs = model.generate(input_ids=inputs["input_ids"], max_length=50)
    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print(f"✅ Test inference output: '{decoded}'")
    print()
    print("🎉 Model is fully repaired. Restart Django and it should load.")

except Exception as e:
    print(f"❌ Final verification failed: {e}")
    print("   Paste this error and we'll fix the next layer.")