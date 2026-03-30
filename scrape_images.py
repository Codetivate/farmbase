import urllib.request
import re
from html.parser import HTMLParser

url = "https://docs.isaacsim.omniverse.nvidia.com/5.1.0/assets/usd_assets_environments.html"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

# Find image tags using regex
images = re.findall(r'<img[^>]+src="([^">]+)"', html)
for img in images:
    if "warehouse" in img.lower():
        print(f"Found warehouse image: {img}")
