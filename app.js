    /* ─── Theme ──────────────────────────────────────── */
    const THEMES = [
      'apprentice', 'claude', 'github', 'gruvbox', 'paper',
    ];

    function setTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('531_theme', t);
      THEMES.forEach(id => {
        const btn = document.getElementById('tbtn-' + id);
        if (btn) btn.classList.toggle('selected', id === t);
      });
    }

    // Restore saved theme immediately
    (function () {
      const saved = localStorage.getItem('531_theme');
      if (saved && THEMES.includes(saved)) setTheme(saved);
    })();

    /* ─── State ──────────────────────────────────────── */
    let data = null;
    let currentWeek = 1;
    let currentTemplate = 'normal';
    let currentChartLift = 'benchPress';

    const WEEK_LABELS = { 1: '5/5/5+', 2: '3/3/3+', 3: '5/3/1+', 4: 'Deload', 5: 'Hypertrophy' };

    /* ─── 5/3/1 templates (flavors) ──────────────────── */
    // Each template defines the supplemental work appended after the main work
    // sets. Supplemental only applies to the three main weeks (1-3); the deload
    // (4) and hypertrophy (5) weeks are left untouched by the template choice.
    const TEMPLATES = {
      normal:      { label: 'Normal 5/3/1', supp: null },
      // Boring But Big: 5 sets of 10 at a flat 50% of TM.
      bbb:         { label: 'BBB',          supp: { tag: 'BBB', sets: 5, reps: 10, pct: 0.50 } },
      // First Set Last: 5 sets of 5 at the week's first work-set percentage.
      fsl:         { label: 'FSL',          supp: { tag: 'FSL', sets: 5, reps: 5, useSetPct: 0 } },
      // Second Set Last: 5 sets of 5 at the week's second work-set percentage.
      ssl:         { label: 'SSL',          supp: { tag: 'SSL', sets: 5, reps: 5, useSetPct: 1 } },
      // Triumvirate: main lift plus two assistance exercises (no extra barbell work).
      triumvirate: { label: 'Triumvirate',  supp: null },
    };

    // Wendler's classic Triumvirate assistance pairing, keyed by lift.
    const TRIUMVIRATE_ASSISTANCE = {
      benchPress:    ['Dips - 5 × 15', 'DB Row - 5 × 10'],
      squat:         ['Leg Press - 5 × 15', 'Leg Curl - 5 × 10'],
      deadlift:      ['Good Morning - 5 × 12', 'Hanging Leg Raise - 5 × 15'],
      overheadPress: ['Dips - 5 × 15', 'Chin-ups - 5 × 10'],
    };

    const LIFTS = [
      { key: 'benchPress', bodyId: 'benchBody', headId: 'benchHead', metaId: 'benchMeta', tagId: 'benchTag', cls: 'bench' },
      { key: 'squat', bodyId: 'squatBody', headId: 'squatHead', metaId: 'squatMeta', tagId: 'squatTag', cls: 'squat' },
      { key: 'deadlift', bodyId: 'deadliftBody', headId: 'deadliftHead', metaId: 'deadliftMeta', tagId: 'deadliftTag', cls: 'deadlift' },
      { key: 'overheadPress', bodyId: 'ohpBody', headId: 'ohpHead', metaId: 'ohpMeta', tagId: 'ohpTag', cls: 'ohp' },
    ];

    /* ─── Progress tracker: lift lookup for log inputs + chart color ── */
    // Maps each lift key to its card's log input/confirm ids, the CSS
    // variable prefix used for its accent color, and the label shown on
    // the progress tabs and table.
    const LOG_IDS = {
      benchPress: { inputId: 'benchPressLogReps', confirmId: 'benchPressLogConfirm', rowId: 'benchPressLogRow', noteId: 'benchPressLogNote', varPfx: 'bench', tabClass: 'active-bench', label: 'Bench Press' },
      squat: { inputId: 'squatLogReps', confirmId: 'squatLogConfirm', rowId: 'squatLogRow', noteId: 'squatLogNote', varPfx: 'squat', tabClass: 'active-squat', label: 'Squat' },
      deadlift: { inputId: 'deadliftLogReps', confirmId: 'deadliftLogConfirm', rowId: 'deadliftLogRow', noteId: 'deadliftLogNote', varPfx: 'dl', tabClass: 'active-deadlift', label: 'Deadlift' },
      overheadPress: { inputId: 'overheadPressLogReps', confirmId: 'overheadPressLogConfirm', rowId: 'overheadPressLogRow', noteId: 'overheadPressLogNote', varPfx: 'ohp', tabClass: 'active-ohp', label: 'Overhead Press' },
    };

    // Only weeks 1-3 (5/5/5+, 3/3/3+, 5/3/1+) end in a genuine AMRAP top set;
    // Deload and Hypertrophy use fixed rep targets, so there's no max-effort
    // set to log there.
    function isAmrapWeek(week) { return week >= 1 && week <= 3; }

    function updateLogSetVisibility() {
      const showLog = isAmrapWeek(currentWeek);
      Object.values(LOG_IDS).forEach(ids => {
        document.getElementById(ids.rowId).style.display = showLog ? 'flex' : 'none';
        document.getElementById(ids.noteId).style.display = showLog ? 'none' : 'block';
      });
    }

    /* ─── Restore saved data ─────────────────────────── */
    (function restore() {
      try {
        const saved = localStorage.getItem('531_data');
        const savedWeek = localStorage.getItem('531_week');
        const savedTemplate = localStorage.getItem('531_template');
        const savedChartLift = localStorage.getItem('531_chart_lift');
        if (savedTemplate && TEMPLATES[savedTemplate]) currentTemplate = savedTemplate;
        if (savedChartLift && LOG_IDS[savedChartLift]) currentChartLift = savedChartLift;
        if (saved) {
          data = JSON.parse(saved);
          const d = data;
          if (d.benchPress) document.getElementById('benchPressInput').value = d.benchPress;
          if (d.squat) document.getElementById('squatInput').value = d.squat;
          if (d.deadlift) document.getElementById('deadliftInput').value = d.deadlift;
          if (d.overheadPress) document.getElementById('overheadPressInput').value = d.overheadPress;
          currentWeek = savedWeek ? parseInt(savedWeek) : 1;
          renderAll();
        }
      } catch (e) { }
      // Progress tracker renders independently of whether a chart has been
      // generated yet - logged history persists across 531_data resets.
      updateProgressTabs();
      renderProgressChart();
      renderProgressTable();
    })();

    /* ─── Math ───────────────────────────────────────── */
    function roundToNearest5(x) { return Math.round(x / 5) * 5; }

    function calculatePlates(weight) {
      const plates = [45, 35, 25, 15, 10, 5, 2.5];
      const result = [];
      for (const p of plates) { while (weight >= p) { result.push(p); weight -= p; } }
      return result;
    }

    function plateTooltip(weight) {
      const plates = calculatePlates((weight - 45) / 2);
      return plates.length === 0 ? 'Bar Only' : plates.map(p => p + ' lbs').join(' + ');
    }

    /* ─── Template row builders (shared by card + modal) ─ */
    // Condensed supplemental work row (BBB / FSL / SSL): "tag · sets × reps".
    function buildSupplementalRow(supp, liftColor, plateFontSize) {
      const tr = document.createElement('tr');
      tr.className = 'supplemental';
      tr.innerHTML = `
        <td class="supp-label">${supp.tag}</td>
        <td>${Math.round(supp.pct * 100)}%</td>
        <td class="weight-cell">${supp.weight} lbs</td>
        <td class="reps-cell" style="color:${liftColor}">${supp.sets} × ${supp.reps}</td>
        <td style="font-size:${plateFontSize}px">${plateTooltip(supp.weight)}</td>`;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => tr.classList.toggle('highlighted'));
      return tr;
    }

    // Triumvirate assistance note row spanning the full table width.
    function buildAssistanceRow(dataKey, plateFontSize) {
      const items = TRIUMVIRATE_ASSISTANCE[dataKey];
      if (!items) return null;
      const tr = document.createElement('tr');
      tr.className = 'assist-note';
      tr.innerHTML = `<td colspan="5" style="font-size:${plateFontSize}px">Assistance: ${items.join('  ·  ')}</td>`;
      return tr;
    }

    /* ─── Set schemes ────────────────────────────────── */
    function getSetsForWeek(trainingMax, week, template) {
      const tm = trainingMax;
      const warm = [{ pct: 0.35, reps: 5 }, { pct: 0.45, reps: 5 }, { pct: 0.55, reps: 3 }];
      // Main work sets per week. Weeks 1-3 are the three core 5/3/1 sets; the
      // supplemental work below is what the chosen template appends.
      const workSets = {
        1: [{ pct: 0.65, reps: 5 }, { pct: 0.75, reps: 5 }, { pct: 0.85, reps: '5+' }],
        2: [{ pct: 0.70, reps: 3 }, { pct: 0.80, reps: 3 }, { pct: 0.90, reps: '3+' }],
        3: [{ pct: 0.75, reps: 5 }, { pct: 0.85, reps: 3 }, { pct: 0.95, reps: '1+' }],
        4: [{ pct: 0.40, reps: 5 }, { pct: 0.50, reps: 5 }, { pct: 0.60, reps: 5 }],
        5: [{ pct: 0.65, reps: 10 }, { pct: 0.70, reps: 10 }, { pct: 0.75, reps: 10 }],
      };
      const work = (workSets[week] || []).map(s => ({ ...s, weight: roundToNearest5(tm * s.pct) }));

      // Supplemental work only applies to the three main weeks (1-3).
      let supplemental = null;
      const tpl = TEMPLATES[template] || TEMPLATES.normal;
      if (tpl.supp && week >= 1 && week <= 3) {
        // FSL/SSL reuse a main work-set percentage; BBB uses its own flat pct.
        const pct = tpl.supp.useSetPct != null
          ? workSets[week][tpl.supp.useSetPct].pct
          : tpl.supp.pct;
        supplemental = {
          tag: tpl.supp.tag,
          sets: tpl.supp.sets,
          reps: tpl.supp.reps,
          pct,
          weight: roundToNearest5(tm * pct),
        };
      }

      return {
        warm: warm.map(s => ({ ...s, weight: roundToNearest5(tm * s.pct) })),
        work,
        supplemental,
      };
    }

    /* ─── CSS var helper ─────────────────────────────── */
    function cssVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    /* ─── Render ─────────────────────────────────────── */
    function renderAll() {
      if (!data) return;
      document.getElementById('weekSelectorRow').style.display = 'block';
      document.getElementById('liftCards').style.display = 'block';
      updateWeekTabs();
      updateTemplateTabs();
      updateLogSetVisibility();

      LIFTS.forEach(({ key, bodyId, headId, metaId, tagId, cls }) => {
        const max = data[key];
        const tm = roundToNearest5(max * 0.9);
        const { warm, work, supplemental } = getSetsForWeek(tm, currentWeek, currentTemplate);
        const varName = cls === 'deadlift' ? 'dl' : cls;

        document.getElementById(metaId).textContent = `1RM: ${max} lbs · Training Max: ${tm} lbs`;
        document.getElementById(tagId).textContent = WEEK_LABELS[currentWeek];

        // Header
        const head = document.getElementById(headId);
        head.innerHTML = `<tr>
          <th class="th-${cls}">Set</th>
          <th class="th-${cls}">%TM</th>
          <th class="th-${cls}">Weight</th>
          <th class="th-${cls}">Reps</th>
          <th class="th-${cls}">Plates / Side</th>
        </tr>`;

        // Body
        const tbody = document.getElementById(bodyId);
        tbody.innerHTML = '';
        const liftColor = cssVar(`--${varName}-b`);

        warm.forEach((s, i) => {
          const tr = document.createElement('tr');
          tr.className = 'warm';
          tr.innerHTML = `
            <td>W${i + 1}</td>
            <td>${Math.round(s.pct * 100)}%</td>
            <td class="weight-cell">${s.weight} lbs</td>
            <td class="reps-cell">${s.reps}</td>
            <td style="font-size:12px">${plateTooltip(s.weight)}</td>`;
          tbody.appendChild(tr);
        });

        work.forEach((s, i) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="color:var(--fg2)">${i + 1}</td>
            <td style="color:var(--gray)">${Math.round(s.pct * 100)}%</td>
            <td class="weight-cell" style="color:var(--fg)">${s.weight} lbs</td>
            <td class="reps-cell" style="color:${liftColor}">${s.reps}</td>
            <td style="font-size:12px;color:var(--gray)">${plateTooltip(s.weight)}</td>`;
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', () => tr.classList.toggle('highlighted'));
          tbody.appendChild(tr);
        });

        // Supplemental work (BBB / FSL / SSL) on the three main weeks
        if (supplemental) tbody.appendChild(buildSupplementalRow(supplemental, liftColor, 12));

        // Triumvirate assistance note on the three main weeks
        if (currentTemplate === 'triumvirate' && currentWeek <= 3) {
          const note = buildAssistanceRow(key, 12);
          if (note) tbody.appendChild(note);
        }
      });
    }

    /* ─── Week tabs ──────────────────────────────────── */
    function setWeek(w) {
      currentWeek = w;
      localStorage.setItem('531_week', w);
      updateWeekTabs();
      renderAll();
    }

    function updateWeekTabs() {
      document.querySelectorAll('.week-tab').forEach((tab, i) => {
        tab.className = 'week-tab';
        if (i + 1 === currentWeek) tab.classList.add(`active-${currentWeek}`);
      });
    }

    /* ─── Template (flavor) selector ─────────────────── */
    function setTemplate(t) {
      if (!TEMPLATES[t]) return;
      currentTemplate = t;
      localStorage.setItem('531_template', t);
      updateTemplateTabs();
      renderAll();
    }

    function updateTemplateTabs() {
      document.querySelectorAll('.template-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.template === currentTemplate);
      });
    }

    /* ─── Generate ───────────────────────────────────── */
    function bumpLift(inputId, delta) {
      const el = document.getElementById(inputId);
      const current = parseInt(el.value) || 0;
      const next = Math.max(45, Math.min(999, current + delta));
      el.value = next;
      if (data) onGenerateButtonClick();
    }

    function onGenerateButtonClick() {
      const bench = parseInt(document.getElementById('benchPressInput').value);
      const squat = parseInt(document.getElementById('squatInput').value);
      const dl = parseInt(document.getElementById('deadliftInput').value);
      const ohp = parseInt(document.getElementById('overheadPressInput').value);
      if ([bench, squat, dl, ohp].some(v => isNaN(v) || v <= 0)) { alert('Please enter valid positive numbers for all four lifts.'); return; }
      if ([bench, squat, dl, ohp].some(v => v > 999)) { alert('Please enter realistic values (under 1000 lbs).'); return; }
      data = { benchPress: bench, squat, deadlift: dl, overheadPress: ohp };
      localStorage.setItem('531_data', JSON.stringify(data));
      renderAll();
    }

    /* ─── JSON ───────────────────────────────────────── */
    function loadFile(event) {
      const file = event.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          data = JSON.parse(e.target.result);
          const d = data;
          if (d.benchPress) document.getElementById('benchPressInput').value = d.benchPress;
          if (d.squat) document.getElementById('squatInput').value = d.squat;
          if (d.deadlift) document.getElementById('deadliftInput').value = d.deadlift;
          if (d.overheadPress) document.getElementById('overheadPressInput').value = d.overheadPress;
          localStorage.setItem('531_data', JSON.stringify(data));
          renderAll();
        } catch (err) { alert('Error: Invalid JSON file.'); }
      };
      reader.onerror = () => alert('Error reading file.');
      reader.readAsText(file);
    }

    function exportData() {
      if (!data) { alert('Generate a chart first.'); return; }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'lift_data.json';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    /* ─── 1RM ────────────────────────────────────────── */
    function calculateOneRepMax(w, r) {
      if (r === 0) return 0;
      if (r === 1) return w;
      return roundToNearest5(w * (1 + 0.0333 * r));
    }

    function onCalculateButtonClick() {
      const w = parseInt(document.getElementById('weight').value);
      const r = parseInt(document.getElementById('reps').value);
      const out = document.getElementById('oneRepMaxFinal');
      const note = document.getElementById('oneRepMaxNote');
      out.textContent = '—'; note.textContent = '';
      if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
      out.textContent = calculateOneRepMax(w, r) || '—';
      if (r > 10) note.textContent = 'Note: estimates above ~10 reps are less reliable.';
    }

    /* ─── Reps needed ────────────────────────────────── */
    function onRepsNeededClick() {
      const w = Number(document.getElementById('loadedWeight').value);
      const t = Number(document.getElementById('target1rm').value);
      const out = document.getElementById('repsNeededOutput');
      const note = document.getElementById('repsNeededNote');
      out.textContent = '—'; note.textContent = '';
      if (!Number.isFinite(w) || !Number.isFinite(t) || w <= 0 || t <= 0) { note.textContent = 'Enter positive numbers for both fields.'; return; }
      if (t <= w) { out.textContent = '1'; note.textContent = 'One rep already puts your estimated 1RM at or above target.'; return; }
      let reps = Math.min(20, Math.max(1, Math.ceil(30 * (t / w - 1))));
      out.textContent = String(reps);
      if (reps >= 13) note.textContent = 'Estimates above ~12 reps are less reliable. Consider increasing load.';
      else if (reps <= 3) note.textContent = 'Low-rep estimate — good accuracy. Warm up well.';
    }

    /* ─── Progress tracker ────────────────────────────── */
    // History entries persist independently of the 531_data (1RM) blob, so
    // logged sets survive even if the user clears/regenerates their lifts.
    function loadProgressHistory() {
      try { return JSON.parse(localStorage.getItem('531_progress')) || []; }
      catch (e) { return []; }
    }

    function saveProgressHistory(history) {
      localStorage.setItem('531_progress', JSON.stringify(history));
    }

    // Logs the reps performed on the current week's final work set (the
    // AMRAP/top set) for a lift, estimates 1RM via the Epley formula already
    // used elsewhere in the app, and upserts it keyed by lift + today's date
    // (re-logging the same day corrects the earlier entry instead of piling up).
    function logTopSet(liftKey) {
      if (!data) { alert('Generate a chart first so the app knows your top-set weight.'); return; }
      const ids = LOG_IDS[liftKey];
      const input = document.getElementById(ids.inputId);
      const reps = parseInt(input.value);
      if (isNaN(reps) || reps <= 0 || reps > 50) { alert('Enter a valid rep count for the last set.'); return; }

      const tm = roundToNearest5(data[liftKey] * 0.9);
      const { work } = getSetsForWeek(tm, currentWeek, currentTemplate);
      const topSet = work[work.length - 1];
      const oneRM = calculateOneRepMax(topSet.weight, reps);
      const dateStr = new Date().toISOString().slice(0, 10);

      // Keyed by lift + date + week, not just lift + date: logging a
      // different week's top set on the same calendar day (e.g. back-to-back
      // testing, or logging late) must not clobber an earlier week's entry.
      // Re-logging the *same* week on the same day still corrects it.
      let history = loadProgressHistory();
      history = history.filter(h => !(h.lift === liftKey && h.date === dateStr && h.week === currentWeek));
      history.push({ date: dateStr, lift: liftKey, week: currentWeek, weight: topSet.weight, reps, oneRM });
      history.sort((a, b) => a.date.localeCompare(b.date));
      saveProgressHistory(history);

      input.value = '';
      const confirm = document.getElementById(ids.confirmId);
      confirm.textContent = `Logged ${reps} reps @ ${topSet.weight} lbs -> est. 1RM ${oneRM} lbs`;

      if (currentChartLift !== liftKey) setChartLift(liftKey);
      else { renderProgressChart(); renderProgressTable(); }
    }

    function setChartLift(liftKey) {
      if (!LOG_IDS[liftKey]) return;
      currentChartLift = liftKey;
      localStorage.setItem('531_chart_lift', liftKey);
      updateProgressTabs();
      renderProgressChart();
      renderProgressTable();
    }

    function updateProgressTabs() {
      document.querySelectorAll('.progress-tab').forEach(tab => {
        tab.className = 'progress-tab';
        if (tab.dataset.lift === currentChartLift) tab.classList.add(LOG_IDS[currentChartLift].tabClass);
      });
    }

    function currentChartHistory() {
      return loadProgressHistory()
        .filter(h => h.lift === currentChartLift)
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    function formatChartDate(dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }

    // Line chart drawn on canvas (no charting dependency). Redraws fully on
    // every hover frame since datasets here are small (a handful of logged
    // sessions), which keeps the hover crosshair logic simple.
    function renderProgressChart() {
      const canvas = document.getElementById('progressCanvas');
      const emptyState = document.getElementById('progressEmptyState');
      const tooltip = document.getElementById('progressTooltip');
      const history = currentChartHistory();

      if (history.length === 0) {
        canvas.style.display = 'none';
        emptyState.style.display = 'block';
        tooltip.classList.remove('visible');
        return;
      }
      canvas.style.display = 'block';
      emptyState.style.display = 'none';

      const varPfx = LOG_IDS[currentChartLift].varPfx;
      const lineColor = cssVar(`--${varPfx}-b`);
      const gridColor = cssVar('--row-divider');
      const textColor = cssVar('--fg2');

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || canvas.parentElement.clientWidth;
      const height = 260;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.height = height + 'px';
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const padding = { top: 24, right: 20, bottom: 28, left: 44 };
      const plotW = width - padding.left - padding.right;
      const plotH = height - padding.top - padding.bottom;

      const values = history.map(h => h.oneRM);
      let minV = Math.min(...values), maxV = Math.max(...values);
      if (minV === maxV) { minV -= 10; maxV += 10; }
      const pad = (maxV - minV) * 0.2 || 10;
      minV -= pad; maxV += pad;

      const xFor = i => padding.left + (history.length === 1 ? plotW / 2 : (i / (history.length - 1)) * plotW);
      const yFor = v => padding.top + plotH - ((v - minV) / (maxV - minV)) * plotH;

      function draw(hoverIndex) {
        ctx.clearRect(0, 0, width, height);

        // Recessive horizontal gridlines + y-axis labels
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.font = '11px Lexend, sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const gridLines = 4;
        for (let i = 0; i <= gridLines; i++) {
          const v = minV + (maxV - minV) * (i / gridLines);
          const y = yFor(v);
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();
          ctx.fillText(Math.round(v), padding.left - 8, y);
        }

        // X-axis date labels (thin out if there are many sessions)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelIdxs = history.length <= 6
          ? history.map((_, i) => i)
          : [0, Math.floor((history.length - 1) / 2), history.length - 1];
        labelIdxs.forEach(i => ctx.fillText(formatChartDate(history[i].date), xFor(i), height - padding.bottom + 8));

        // Trend line
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        history.forEach((h, i) => {
          const x = xFor(i), y = yFor(h.oneRM);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Point markers (hovered point drawn larger with a surface ring)
        history.forEach((h, i) => {
          const x = xFor(i), y = yFor(h.oneRM);
          const isHover = i === hoverIndex;
          if (isHover) {
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fillStyle = cssVar('--card-bg') || '#000';
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(x, y, isHover ? 5 : 4, 0, Math.PI * 2);
          ctx.fillStyle = lineColor;
          ctx.fill();
        });

        // Direct label on the most recent point
        const lastIdx = history.length - 1;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = '600 12px Lexend, sans-serif';
        ctx.fillText(`${history[lastIdx].oneRM} lbs`, xFor(lastIdx), yFor(history[lastIdx].oneRM) - 12);
      }

      draw(-1);
      canvas._chart = { history, xFor, draw };
    }

    function handleProgressHover(e) {
      const canvas = e.currentTarget;
      const chart = canvas._chart;
      if (!chart) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      let nearest = 0, minDist = Infinity;
      chart.history.forEach((h, i) => {
        const dist = Math.abs(chart.xFor(i) - mouseX);
        if (dist < minDist) { minDist = dist; nearest = i; }
      });
      chart.draw(nearest);

      const entry = chart.history[nearest];
      const tooltip = document.getElementById('progressTooltip');
      tooltip.innerHTML = `<strong>${formatChartDate(entry.date)}</strong> &middot; Week ${entry.week}<br>${entry.weight} lbs &times; ${entry.reps} reps<br>Est. 1RM: <strong>${entry.oneRM} lbs</strong>`;
      tooltip.style.left = chart.xFor(nearest) + 'px';
      tooltip.style.top = '6px';
      tooltip.classList.add('visible');
    }

    function handleProgressLeave(e) {
      const canvas = e.currentTarget;
      if (canvas._chart) canvas._chart.draw(-1);
      document.getElementById('progressTooltip').classList.remove('visible');
    }

    document.getElementById('progressCanvas').addEventListener('mousemove', handleProgressHover);
    document.getElementById('progressCanvas').addEventListener('mouseleave', handleProgressLeave);

    // Redraw on resize so the canvas stays crisp/full-width (debounced).
    let progressResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(progressResizeTimer);
      progressResizeTimer = setTimeout(renderProgressChart, 150);
    });

    // Accessible/manageable data table beneath the chart: newest first, with
    // the date/weight/reps cells editable inline (for back-logging or fixing
    // a mis-typed entry) and a delete action to remove one outright.
    function renderProgressTable() {
      const tbody = document.getElementById('progressTableBody');
      const history = currentChartHistory().slice().reverse();
      const todayStr = new Date().toISOString().slice(0, 10);
      tbody.innerHTML = '';
      history.forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="date" class="progress-date-input" value="${h.date}" max="${todayStr}"></td>
          <td>${h.week}</td>
          <td><input type="number" class="progress-weight-input" value="${h.weight}" min="1" max="999"></td>
          <td><input type="number" class="progress-reps-input" value="${h.reps}" min="1" max="50"></td>
          <td class="progress-onerm-cell">${h.oneRM} lbs</td>
          <td><button class="progress-del-btn" title="Delete entry">&times;</button></td>`;

        const dateInput = tr.querySelector('.progress-date-input');
        const weightInput = tr.querySelector('.progress-weight-input');
        const repsInput = tr.querySelector('.progress-reps-input');

        // Bind on 'change' (fires on blur/Enter/date-pick), not 'input', so
        // edits commit once rather than re-rendering on every keystroke.
        // Entries are identified by lift + date + week (not date alone), since
        // two different weeks can legitimately share a calendar date.
        dateInput.addEventListener('change', () => updateProgressEntryDate(h.lift, h.date, h.week, dateInput.value, dateInput));
        weightInput.addEventListener('change', () => updateProgressEntryField(h.lift, h.date, h.week, 'weight', weightInput.value, weightInput));
        repsInput.addEventListener('change', () => updateProgressEntryField(h.lift, h.date, h.week, 'reps', repsInput.value, repsInput));

        tr.querySelector('.progress-del-btn').addEventListener('click', () => deleteProgressEntry(h.lift, h.date, h.week));
        tbody.appendChild(tr);
      });
    }

    // Edits weight or reps on an existing entry and recomputes its 1RM.
    // (originalDate, week) identify the entry being edited.
    function updateProgressEntryField(liftKey, originalDate, week, field, rawValue, inputEl) {
      const history = loadProgressHistory();
      const entry = history.find(e => e.lift === liftKey && e.date === originalDate && e.week === week);
      if (!entry) return;

      const max = field === 'weight' ? 999 : 50;
      const value = parseInt(rawValue);
      if (isNaN(value) || value <= 0 || value > max) {
        alert(`Enter a valid ${field} (1-${max}).`);
        inputEl.value = entry[field];
        return;
      }

      entry[field] = value;
      entry.oneRM = calculateOneRepMax(entry.weight, entry.reps);
      saveProgressHistory(history);
      renderProgressChart();
      renderProgressTable();
    }

    // Edits the date on an existing entry (e.g. back-logging a missed day).
    // The entry keeps its week, so a collision only occurs if that same week
    // is already logged on the target date - a different week on that date
    // is a distinct, coexisting point and not a collision.
    function updateProgressEntryDate(liftKey, originalDate, week, newDate, inputEl) {
      if (!newDate || newDate === originalDate) { inputEl.value = originalDate; return; }

      let history = loadProgressHistory();
      const entry = history.find(e => e.lift === liftKey && e.date === originalDate && e.week === week);
      if (!entry) return;

      const collision = history.find(e => e.lift === liftKey && e.date === newDate && e.week === week);
      if (collision) {
        const label = LOG_IDS[liftKey].label;
        if (!confirm(`${label} week ${week} already has a logged set on ${formatChartDate(newDate)}. Overwrite it with this entry?`)) {
          inputEl.value = originalDate;
          return;
        }
        history = history.filter(e => e !== collision);
      }

      entry.date = newDate;
      history.sort((a, b) => a.date.localeCompare(b.date));
      saveProgressHistory(history);
      renderProgressChart();
      renderProgressTable();
    }

    function deleteProgressEntry(liftKey, dateStr, week) {
      let history = loadProgressHistory();
      history = history.filter(h => !(h.lift === liftKey && h.date === dateStr && h.week === week));
      saveProgressHistory(history);
      renderProgressChart();
      renderProgressTable();
    }

    function clearProgressHistory() {
      const label = LOG_IDS[currentChartLift].label;
      if (!confirm(`Clear all logged progress for ${label}? This can't be undone.`)) return;
      let history = loadProgressHistory();
      history = history.filter(h => h.lift !== currentChartLift);
      saveProgressHistory(history);
      renderProgressChart();
      renderProgressTable();
    }

    // 531_progress lives only in this browser's localStorage, so it's wiped
    // by a "clear cookies and site data" reset (unlike 531_data, it has no
    // export button of its own until now). This gives it the same backup
    // path as the 1RM data via exportData()/loadFile().
    function exportProgressData() {
      const history = loadProgressHistory();
      if (history.length === 0) { alert('No logged progress to export yet.'); return; }
      const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'lift_progress.json';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    // Imports a previously exported history file, upserting by lift+date+week
    // so re-importing a backup corrects matching entries rather than
    // duplicating, while still keeping distinct weeks logged on the same day.
    function loadProgressFile(event) {
      const file = event.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        let imported;
        try { imported = JSON.parse(e.target.result); }
        catch (err) { alert('Error: Invalid JSON file.'); return; }
        if (!Array.isArray(imported)) { alert('Error: Expected a progress history JSON array.'); return; }

        let history = loadProgressHistory();
        let added = 0, skipped = 0;
        imported.forEach(entry => {
          const valid = entry && LOG_IDS[entry.lift] && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
            && Number.isFinite(entry.weight) && Number.isFinite(entry.reps) && Number.isFinite(entry.oneRM);
          if (!valid) { skipped++; return; }
          const week = entry.week || 1;
          history = history.filter(h => !(h.lift === entry.lift && h.date === entry.date && h.week === week));
          history.push({ date: entry.date, lift: entry.lift, week, weight: entry.weight, reps: entry.reps, oneRM: entry.oneRM });
          added++;
        });
        history.sort((a, b) => a.date.localeCompare(b.date));
        saveProgressHistory(history);
        renderProgressChart();
        renderProgressTable();
        alert(`Imported ${added} entr${added === 1 ? 'y' : 'ies'}${skipped ? `, skipped ${skipped} invalid` : ''}.`);
      };
      reader.onerror = () => alert('Error reading file.');
      reader.readAsText(file);
      event.target.value = '';
    }

    /* ─── Lift focus modal ───────────────────────────── */
    const MODAL_META = {
      bench: { title: 'Bench Press', cls: 'bench', varPfx: 'bench' },
      squat: { title: 'Squat', cls: 'squat', varPfx: 'squat' },
      deadlift: { title: 'Deadlift', cls: 'deadlift', varPfx: 'dl' },
      ohp: { title: 'Overhead Press', cls: 'ohp', varPfx: 'ohp' },
    };

    const DATA_KEY = {
      bench: 'benchPress', squat: 'squat', deadlift: 'deadlift', ohp: 'overheadPress',
    };

    function openModal(liftKey) {
      if (!data) return;
      const { title, cls, varPfx } = MODAL_META[liftKey];
      const dataKey = DATA_KEY[liftKey];
      const max = data[dataKey];
      const tm = roundToNearest5(max * 0.9);
      const { warm, work, supplemental } = getSetsForWeek(tm, currentWeek, currentTemplate);
      const liftColor = cssVar(`--${varPfx}-b`);
      const borderColor = cssVar(`--${varPfx}-border`);
      const thBg = cssVar(`--${varPfx}-th`);

      // Header content
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalMeta').textContent =
        `1RM: ${max} lbs · Training Max: ${tm} lbs · ${WEEK_LABELS[currentWeek]} · ${TEMPLATES[currentTemplate].label}`;

      // Apply lift-colour border-top to modal
      const modal = document.getElementById('liftModal');
      modal.style.borderTop = `3px solid ${liftColor}`;
      modal.style.border = `1px solid ${borderColor}`;
      modal.style.borderTop = `3px solid ${liftColor}`;

      // Table head
      const head = document.getElementById('modalHead');
      head.innerHTML = `<tr>
        <th style="background:${thBg};color:${liftColor};border-bottom:1px solid ${borderColor};padding:11px 16px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.1em;text-transform:uppercase;">Set</th>
        <th style="background:${thBg};color:${liftColor};border-bottom:1px solid ${borderColor};padding:11px 16px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.1em;text-transform:uppercase;">%TM</th>
        <th style="background:${thBg};color:${liftColor};border-bottom:1px solid ${borderColor};padding:11px 16px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.1em;text-transform:uppercase;">Weight</th>
        <th style="background:${thBg};color:${liftColor};border-bottom:1px solid ${borderColor};padding:11px 16px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.1em;text-transform:uppercase;">Reps</th>
        <th style="background:${thBg};color:${liftColor};border-bottom:1px solid ${borderColor};padding:11px 16px;font-size:12px;font-weight:700;text-align:center;letter-spacing:0.1em;text-transform:uppercase;">Plates / Side</th>
      </tr>`;

      // Table body
      const tbody = document.getElementById('modalBody');
      tbody.innerHTML = '';

      warm.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.className = 'warm';
        tr.innerHTML = `
          <td>W${i + 1}</td>
          <td>${Math.round(s.pct * 100)}%</td>
          <td class="weight-cell">${s.weight} lbs</td>
          <td class="reps-cell">${s.reps}</td>
          <td style="font-size:13px">${plateTooltip(s.weight)}</td>`;
        tbody.appendChild(tr);
      });

      work.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="color:var(--fg2)">${i + 1}</td>
          <td style="color:var(--gray)">${Math.round(s.pct * 100)}%</td>
          <td class="weight-cell" style="color:var(--fg)">${s.weight} lbs</td>
          <td class="reps-cell" style="color:${liftColor}">${s.reps}</td>
          <td style="font-size:13px;color:var(--gray)">${plateTooltip(s.weight)}</td>`;
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => tr.classList.toggle('highlighted'));
        tbody.appendChild(tr);
      });

      // Supplemental work (BBB / FSL / SSL) on the three main weeks
      if (supplemental) tbody.appendChild(buildSupplementalRow(supplemental, liftColor, 13));

      // Triumvirate assistance note on the three main weeks
      if (currentTemplate === 'triumvirate' && currentWeek <= 3) {
        const note = buildAssistanceRow(dataKey, 13);
        if (note) tbody.appendChild(note);
      }

      // Show
      const backdrop = document.getElementById('liftModalBackdrop');
      backdrop.style.display = 'flex';
      // Trigger animation on next frame
      requestAnimationFrame(() => backdrop.classList.add('open'));
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      const backdrop = document.getElementById('liftModalBackdrop');
      backdrop.classList.remove('open');
      // Wait for transition then hide
      backdrop.addEventListener('transitionend', () => {
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
      }, { once: true });
    }

    function handleBackdropClick(e) {
      if (e.target === document.getElementById('liftModalBackdrop')) closeModal();
    }

    /* ─── Help modal ─────────────────────────────────── */
    function openHelpModal() {
      const backdrop = document.getElementById('helpModalBackdrop');
      backdrop.style.display = 'flex';
      requestAnimationFrame(() => backdrop.classList.add('open'));
      document.body.style.overflow = 'hidden';
    }

    function closeHelpModal() {
      const backdrop = document.getElementById('helpModalBackdrop');
      backdrop.classList.remove('open');
      backdrop.addEventListener('transitionend', () => {
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
      }, { once: true });
    }

    function handleHelpBackdropClick(e) {
      if (e.target === document.getElementById('helpModalBackdrop')) closeHelpModal();
    }

    // Escape key closes any open modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const liftBackdrop = document.getElementById('liftModalBackdrop');
        const helpBackdrop = document.getElementById('helpModalBackdrop');
        if (liftBackdrop.classList.contains('open')) { e.preventDefault(); closeModal(); }
        else if (helpBackdrop.classList.contains('open')) { e.preventDefault(); closeHelpModal(); }
      }
    });

    /* ─── Enter keys ─────────────────────────────────── */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const id = document.activeElement && document.activeElement.id;
      if (['weight', 'reps'].includes(id)) { e.preventDefault(); onCalculateButtonClick(); }
      if (['loadedWeight', 'target1rm'].includes(id)) { e.preventDefault(); onRepsNeededClick(); }
      if (['benchPressInput', 'squatInput', 'deadliftInput', 'overheadPressInput'].includes(id)) { e.preventDefault(); onGenerateButtonClick(); }
      const logLift = Object.keys(LOG_IDS).find(k => LOG_IDS[k].inputId === id);
      if (logLift) { e.preventDefault(); logTopSet(logLift); }
    });
