from pathlib import Path
import re,pypandoc
source=Path('/Users/itz_sour4v/.codex/attachments/87102d45-72ed-4b74-8e37-533a2a87d7d2/Pasted text.txt').read_text()
source=source.replace('Oasys Arena','Oasys').replace('oasys-arena/','OasysHOH/').replace('Arena Console','Oasys Console')
# Preserve diagram meaning as readable Mermaid instead of raw TikZ.
diagrams=[
'flowchart TD\n  Benchmarks --> Red\n  Red <--> Broker\n  Blue <--> Broker\n  Broker <--> Worker[Fresh model worker]\n  Broker --> Audit[Hash-chained audit log]\n  Worker --> Teardown\n  Audit --> Verifier',
'flowchart LR\n  Commit --> Policy --> Token --> Worker --> Reveal --> Evaluate --> Answer --> Seal --> Teardown --> Verify',
'flowchart TD\n  A[Shared baseline] --> B[Shared prefix cache]\n  B --> C[Timing leakage]\n  D[Oasys] --> E[Fresh worker per run]\n  E --> F[No cache carried between runs]\n  F --> G[Residual host timing remains]',
'flowchart LR\n  Genesis --> Event0 --> Event1 --> EventN --> Signature[Ed25519 seal]\n  Signature --> Verifier --> Finding[Reproduce finding ID]',
'flowchart TD\n  Browser --> HTTPS --> Console --> Broker\n  Red <--> Broker\n  Blue <--> Broker\n  Broker <--> Worker\n  Broker --> Audit --> Verifier']
slots=[]
def figure(m):
 i=len(slots);slots.append(diagrams[i]);return '\nDIAGRAMPLACEHOLDER'+str(i)+'\n'
source=re.sub(r'\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}',figure,source)

# Extract tables verbatim before Pandoc: its LaTeX column parser drops leading
# numerals from several supplied custom-column cells.
mdtables=[]
def plain(v):
    v=v.strip()
    for _ in range(6):
        v=re.sub(r'\\textbf\{([^{}]*)\}',r'**\1**',v)
        v=re.sub(r'\\(?:texttt|emph)\{([^{}]*)\}',r'`\1`',v)
    v=re.sub(r'\\cite\{([^}]+)\}',r'[ref: \1]',v)
    v=re.sub(r'\\ref\{([^}]+)\}',r'\1',v)
    v=v.replace('\\textperiodcentered{}','·').replace('\\&','&').replace('\\_','_').replace('\\$','$').replace('~',' ').replace('---','—').replace('--','–').replace('``','“').replace("''",'”')
    return v

def table(m):
    rows=[]
    for line in m.group().splitlines():
        if '&' not in line or not line.rstrip().endswith('\\\\'):continue
        cells=[plain(c) for c in line.rstrip()[:-2].split('&')]
        if cells not in rows:rows.append(cells)
    if not rows:return ''
    count=len(rows[0]);rows=[r for r in rows if len(r)==count]
    lines=['| '+' | '.join(rows[0])+' |','| '+' | '.join(['---']*count)+' |']
    lines+=['| '+' | '.join(r)+' |' for r in rows[1:]]
    index=len(mdtables);mdtables.append('\n'.join(lines));return '\nTABLEPLACEHOLDER'+str(index)+'\n'
source=re.sub(r'\\begin\{(tabularx|tabular|longtable)\}[\s\S]*?\\end\{\1\}',table,source)
refs=re.search(r'\\begin\{thebibliography\}[\s\S]*?\\end\{thebibliography\}',source).group()
references=[]
for key,body in re.findall(r'\\bibitem\{([^}]+)\}([\s\S]*?)(?=\\bibitem|\\end\{thebibliography\})',refs):references.append('- **'+key+'**: '+plain(body))
source=source.replace(refs,'\nREFERENCESPLACEHOLDER\n')
source=re.sub(r'\\cite\{([^}]+)\}',r'[ref: \1]',source)
text=pypandoc.convert_text(source,'gfm',format='latex',extra_args=['--wrap=none'])
for i,d in enumerate(slots):text=text.replace('DIAGRAMPLACEHOLDER'+str(i),'```mermaid\n'+d+'\n```')
for i,t in reversed(list(enumerate(mdtables))):text=text.replace('TABLEPLACEHOLDER'+str(i),t)
text=text.replace('REFERENCESPLACEHOLDER','# References\n\n'+'\n'.join(references))
text=re.sub(r'</?div[^>]*>\n?', '',text)
text=re.sub(r'\n{3,}','\n\n',text)
text='# Oasys — Product specification\n\n> Converted from the supplied Round 1 proposal. Product naming updated to Oasys. Research statements, event dates, and target results are preserved as proposal content, not independently verified implementation claims. See IMPLEMENTATION.md for actual device results.\n\n'+text
Path('docs/SPECIFICATION.md').write_text(text)
print('Converted specification:',len(text),'characters;',len(mdtables),'tables and',len(slots),'diagrams')
