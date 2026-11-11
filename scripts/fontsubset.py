import re

h = open('site/index.html', encoding='utf-8').read()
h = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>|<[^>]+>', ' ', h)
extra = (' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`'
         'abcdefghijklmnopqrstuvwxyz{|}~éèêëàâäôöùûüçÉÈÊËÀÂÄÔÖÙÛÜÇ—–‘’“”…·•✦'
         '→←↑↓×°€£©®™')
chars = set(h + extra)
open('project/fontchars.txt', 'w', encoding='utf-8').write(''.join(sorted(chars)))
print('chars', len(chars))
