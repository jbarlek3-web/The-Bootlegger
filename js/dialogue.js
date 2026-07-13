'use strict';
/* The Bootlegger — dialogue engine.
 *
 * A dialogue node: { name, text, options: [ { label, cond?, effect?, next? } ] }
 *   cond()   -> option is shown only if truthy (omit for always)
 *   effect() -> run when picked
 *   next     -> node object, or function returning one; omit/null to close
 * Numbers 1-9 or click to choose. */

(function () {
  const elDlg = () => document.getElementById('dialogue');
  const elName = () => document.getElementById('dlg-name');
  const elText = () => document.getElementById('dlg-text');
  const elOpts = () => document.getElementById('dlg-options');

  let current = null;

  B.openDialogue = function (node) {
    if (!node) return B.closeDialogue();
    current = node;
    B.mode = 'dialogue';
    elDlg().classList.remove('hidden');
    elName().textContent = node.name || '';
    elText().textContent = typeof node.text === 'function' ? node.text() : node.text;
    const list = elOpts();
    list.innerHTML = '';
    const opts = (node.options || []).filter(o => !o.cond || o.cond());
    if (!opts.length) opts.push({ label: '(Leave)' });
    node._visible = opts;
    opts.forEach((o, i) => {
      const li = document.createElement('li');
      li.dataset.num = i + 1;
      li.textContent = typeof o.label === 'function' ? o.label() : o.label;
      li.addEventListener('click', () => B.chooseOption(i));
      list.appendChild(li);
    });
  };

  B.chooseOption = function (i) {
    if (!current || !current._visible || !current._visible[i]) return;
    const o = current._visible[i];
    if (o.effect) o.effect();
    let nxt = o.next;
    if (typeof nxt === 'function') nxt = nxt();
    if (nxt) B.openDialogue(nxt);
    else B.closeDialogue();
  };

  B.closeDialogue = function () {
    current = null;
    elDlg().classList.add('hidden');
    if (B.mode === 'dialogue') B.mode = 'play';
    B.emit('dialogueEnd');
  };

  B.dialogueKey = function (e) {
    const k = e.key;
    if (k >= '1' && k <= '9') B.chooseOption(parseInt(k, 10) - 1);
    else if (k === 'Escape') B.closeDialogue();
    else if (k === 'Enter' && current && current._visible.length === 1) B.chooseOption(0);
  };

  /* convenience builders */
  B.say = (name, text, options) => ({ name, text, options: options || [{ label: '(Leave)' }] });
  B.back = (label, node) => ({ label: label || 'Never mind.', next: node });
})();
