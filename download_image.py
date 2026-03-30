import urllib.request
import re
import os

url = "https://docs.isaacsim.omniverse.nvidia.com/5.1.0/assets/usd_assets_environments.html"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

# Find image tags
images = re.findall(r'<img[^>]+src="([^">]+)"', html)
for img in images:
    if "warehouse" in img.lower():
        full_url = "https://docs.isaacsim.omniverse.nvidia.com/5.1.0/" + img.replace("../", "")
        print(f"Downloading: {full_url}")
        dest = r"C:\Users\nesnk\.gemini\antigravity\brain\ce126b09-332a-47d8-b6bb-888fbeac7deb\nvidia_warehouse_doc.png"
        req_img = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
        with open(dest, 'wb') as f:
            f.write(urllib.request.urlopen(req_img).read())
        print(f"Saved to {dest}")
        break
