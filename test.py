import asyncio
import aiohttp
import time
import statistics
import requests
from tqdm import tqdm

# === CONFIG ===
API_KEY = "IBMid-6970010V1G-2025-07-26T07:05:40Z"
PROJECT_ID = "4bed7ea7-6f3b-4db5-ada2-d73b8f82309d"
MODEL_ID = "meta-llama/llama-2-70b-chat"
ENDPOINT = "https://us-south.ml.cloud.ibm.com"  # Change if in another region
NUM_REQUESTS = 500
CONCURRENCY = 50

# === GET IAM TOKEN ===
def get_iam_token(api_key):
    url = "https://iam.cloud.ibm.com/identity/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
        "apikey": api_key
    }
    response = requests.post(url, headers=headers, data=data)
    response.raise_for_status()
    return response.json()["access_token"]

# === GLOBAL VARIABLES ===
iam_token = get_iam_token(API_KEY)
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {iam_token}"
}

payload_template = {
    "model_id": MODEL_ID,
    "input": "Explain black holes in simple terms.",
    "parameters": {
        "decoding_method": "greedy",
        "max_new_tokens": 100
    },
    "project_id": PROJECT_ID
}

results = []

# === SEND ONE REQUEST ===
async def send_request(session, sem, index):
    async with sem:
        url = f"{ENDPOINT}/ml/v1/text/generation?version=2024-05-10"
        start = time.time()
        try:
            async with session.post(url, headers=HEADERS, json=payload_template) as response:
                elapsed = time.time() - start
                if response.status == 200:
                    results.append(elapsed)
                else:
                    print(f"❌ {index}: HTTP {response.status}")
        except Exception as e:
            print(f"❌ {index}: {e}")

# === MAIN FUNCTION ===
async def main():
    sem = asyncio.Semaphore(CONCURRENCY)
    async with aiohttp.ClientSession() as session:
        tasks = [send_request(session, sem, i) for i in range(NUM_REQUESTS)]
        for f in tqdm(asyncio.as_completed(tasks), total=len(tasks), desc="Testing Load"):
            await f

if __name__ == "__main__":
    print(f"\n🚀 Launching {NUM_REQUESTS} requests with concurrency = {CONCURRENCY}")
    start_time = time.time()
    asyncio.run(main())
    duration = time.time() - start_time

    # === METRICS ===
    print("\n📊 Load Test Complete:")
    print(f"Total requests: {NUM_REQUESTS}")
    print(f"Success responses: {len(results)}")
    print(f"Failures: {NUM_REQUESTS - len(results)}")
    if results:
        print(f"Average latency: {statistics.mean(results):.2f} sec")
        print(f"Fastest: {min(results):.2f} sec | Slowest: {max(results):.2f} sec")
        print(f"Total time: {duration:.2f} sec | QPS: {NUM_REQUESTS / duration:.2f}")
