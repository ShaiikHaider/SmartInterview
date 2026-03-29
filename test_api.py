import asyncio, sys, os
sys.path.append(os.getcwd())
try:
    from backend.ai_service import API_KEYS, MODEL
    from google import genai
    from google.genai import errors

    async def test():
        client = genai.Client(api_key=API_KEYS[0])
        try:
            print(f"Testing {MODEL}")
            resp = await client.aio.models.generate_content(
                model=MODEL, contents="hello"
            )
            print("Success:", len(resp.text))
        except errors.ClientError as e:
            print("ClientError:", str(e))
        except Exception as e:
            print("Other Exception:", str(e))

    asyncio.run(test())
except Exception as e:
    print("Startup Error:", str(e))
