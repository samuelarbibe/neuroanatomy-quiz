(function () {
  "use strict";

  var COUNT_OPTIONS = [10, 20, 30, 50, 100];
  var LETTERS = ["א", "ב", "ג", "ד"];

  var state = {
    topic: "all",
    count: 20,
    deck: [],
    index: 0,
    slots: []
  };

  var screens = {
    start: document.getElementById("screen-start"),
    quiz: document.getElementById("screen-quiz"),
    result: document.getElementById("screen-result")
  };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("active", k === name);
    });
    window.scrollTo(0, 0);
  }

  function filterQuestions(topic) {
    if (topic === "all") return QUESTIONS.slice();
    return QUESTIONS.filter(function (q) { return q.topic === topic; });
  }

  function countCorrect() {
    var n = 0;
    state.slots.forEach(function (s) {
      if (s && s.answered && s.chosenOrig === state.deck[s.qIndex].correct) n++;
    });
    return n;
  }

  function buildTopicChips() {
    var wrap = document.getElementById("topic-chips");
    var allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "chip selected";
    allBtn.dataset.topic = "all";
    allBtn.textContent = "כל הנושאים (" + QUESTIONS.length + ")";
    wrap.appendChild(allBtn);

    Object.keys(TOPICS).forEach(function (key) {
      var n = QUESTIONS.filter(function (q) { return q.topic === key; }).length;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.topic = key;
      btn.textContent = TOPICS[key].emoji + " " + TOPICS[key].label + " (" + n + ")";
      wrap.appendChild(btn);
    });

    wrap.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      wrap.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("selected"); });
      chip.classList.add("selected");
      state.topic = chip.dataset.topic;
      updateCountOptions();
    });
  }

  function updateCountOptions() {
    var pool = filterQuestions(state.topic);
    var max = pool.length;
    var wrap = document.getElementById("count-opts");
    wrap.innerHTML = "";

    COUNT_OPTIONS.forEach(function (n) {
      if (n > max && n !== max) return;
      var val = Math.min(n, max);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.dataset.count = String(val);
      btn.textContent = n > max ? val + " (הכל)" : String(n);
      if (val === state.count || (n > max && state.count >= max)) {
        btn.classList.add("primary");
        state.count = val;
      }
      wrap.appendChild(btn);
    });

    if (!wrap.querySelector(".primary") && wrap.lastChild) {
      state.count = max;
      wrap.lastChild.classList.add("primary");
    }
  }

  function buildCountOptions() {
    var wrap = document.getElementById("count-opts");
    wrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".btn");
      if (!btn || !btn.dataset.count) return;
      wrap.querySelectorAll(".btn").forEach(function (b) { b.classList.remove("primary"); });
      btn.classList.add("primary");
      state.count = parseInt(btn.dataset.count, 10);
    });
    updateCountOptions();
  }

  function ensureSlot(i) {
    if (!state.slots[i]) {
      state.slots[i] = {
        qIndex: i,
        order: null,
        chosenOrig: null,
        answered: false
      };
    }
    return state.slots[i];
  }

  function getShuffledOrder(q) {
    var items = q.opts.map(function (text, orig) { return { text: text, orig: orig }; });
    return shuffle(items);
  }

  function buildNavStrip() {
    var wrap = document.getElementById("q-nav");
    wrap.innerHTML = "";
    state.deck.forEach(function (_, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "qnav-btn";
      btn.textContent = String(i + 1);
      btn.dataset.idx = String(i);
      if (i === state.index) btn.classList.add("current");
      var slot = state.slots[i];
      if (slot && slot.answered) {
        var ok = slot.chosenOrig === state.deck[i].correct;
        btn.classList.add(ok ? "done-ok" : "done-bad");
      }
      btn.addEventListener("click", function () { goTo(i); });
      wrap.appendChild(btn);
    });
  }

  function startQuiz(fromReview) {
    if (!fromReview) {
      var pool = filterQuestions(state.topic);
      if (!pool.length) return;
      state.deck = shuffle(pool).slice(0, Math.min(state.count, pool.length));
      state.index = 0;
      state.slots = state.deck.map(function (_, i) {
        return { qIndex: i, order: null, chosenOrig: null, answered: false };
      });
    }
    showScreen("quiz");
    renderQuestion();
  }

  function goTo(i) {
    if (i < 0 || i >= state.deck.length) return;
    state.index = i;
    renderQuestion();
  }

  function renderQuestion() {
    var q = state.deck[state.index];
    var meta = TOPICS[q.topic];
    var slot = ensureSlot(state.index);
    var total = state.deck.length;
    var num = state.index + 1;

    if (!slot.order) slot.order = getShuffledOrder(q);

    document.getElementById("progress-fill").style.width =
      ((num - (slot.answered ? 0 : 1)) / total * 100) + "%";
    document.getElementById("progress-label").textContent = "שאלה " + num + " מתוך " + total;
    document.getElementById("score-pill").textContent = countCorrect() + " נכונות";
    document.getElementById("q-topic").textContent = meta ? meta.emoji + " " + meta.label : q.topic;
    document.getElementById("q-text").textContent = q.q;

    var optsWrap = document.getElementById("q-options");
    optsWrap.innerHTML = "";

    slot.order.forEach(function (item, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.innerHTML = "<span class=\"opt-letter\">" + LETTERS[i] + ".</span><span class=\"opt-text\">" + item.text + "</span>";
      btn.dataset.orig = String(item.orig);
      if (!slot.answered) {
        btn.addEventListener("click", function () { answer(btn, q, slot, parseInt(btn.dataset.orig, 10)); });
      }
      optsWrap.appendChild(btn);
    });

    var expl = document.getElementById("q-explain");
    expl.className = "explain";
    expl.classList.remove("show", "good", "bad");

    if (slot.answered) {
      applyAnswerUI(q, slot);
      showExplanation(q, slot.chosenOrig === q.correct, q.expl);
    } else {
      document.getElementById("q-verdict").textContent = "";
      document.getElementById("q-explain-text").textContent = "";
    }

    document.getElementById("btn-prev").disabled = state.index === 0;
    var nextBtn = document.getElementById("btn-next");
    nextBtn.disabled = !slot.answered;
    nextBtn.textContent = state.index < total - 1 ? "הבא ←" : "סיום הבוחן ←";

    buildNavStrip();
  }

  function applyAnswerUI(q, slot) {
    var buttons = document.querySelectorAll("#q-options .opt");
    buttons.forEach(function (b) {
      b.disabled = true;
      var orig = parseInt(b.dataset.orig, 10);
      if (orig === q.correct) b.classList.add("correct");
      else if (orig === slot.chosenOrig) b.classList.add("wrong");
      else b.classList.add("dim");
    });
  }

  function showExplanation(q, isCorrect, text) {
    var expl = document.getElementById("q-explain");
    expl.classList.add("show", isCorrect ? "good" : "bad");
    document.getElementById("q-verdict").textContent = isCorrect ? "✓ נכון!" : "✗ לא מדויק";
    document.getElementById("q-explain-text").textContent = text;
  }

  function answer(btn, q, slot, chosenOrig) {
    if (slot.answered) return;
    slot.answered = true;
    slot.chosenOrig = chosenOrig;

    document.getElementById("score-pill").textContent = countCorrect() + " נכונות";
    applyAnswerUI(q, slot);
    showExplanation(q, chosenOrig === q.correct, q.expl);

    document.getElementById("btn-next").disabled = false;
    document.getElementById("progress-fill").style.width =
      ((state.index + 1) / state.deck.length * 100) + "%";
    buildNavStrip();
  }

  function finishQuiz() {
    var total = state.deck.length;
    var correct = countCorrect();
    var pct = total ? Math.round(correct / total * 100) : 0;

    document.getElementById("result-score").textContent = correct + " / " + total;
    document.getElementById("result-grade").textContent = gradeText(pct);

    var review = document.getElementById("review-wrap");
    review.innerHTML = "";

    var title = document.createElement("h3");
    title.textContent = "סקירת כל השאלות";
    title.style.margin = "24px 0 12px";
    review.appendChild(title);

    state.deck.forEach(function (q, i) {
      var slot = state.slots[i];
      if (!slot || !slot.answered) return;
      var ok = slot.chosenOrig === q.correct;
      var meta = TOPICS[q.topic];
      var item = document.createElement("div");
      item.className = "review-item" + (ok ? "" : " review-wrong");
      item.innerHTML =
        "<div class=\"rq\">" + (i + 1) + ". " + q.q + "</div>" +
        "<div class=\"ra " + (ok ? "good" : "bad") + "\">" +
          (ok ? "✓ " : "✗ בחרת: " + q.opts[slot.chosenOrig] + " · נכון: ") +
          q.opts[q.correct] +
        "</div>" +
        "<div class=\"re\">" + (meta ? meta.label + " · " : "") + q.expl + "</div>" +
        "<button type=\"button\" class=\"btn btn-sm review-jump\" data-idx=\"" + i + "\">חזרה לשאלה ←</button>";
      review.appendChild(item);
    });

    review.querySelectorAll(".review-jump").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.index = parseInt(btn.dataset.idx, 10);
        showScreen("quiz");
        renderQuestion();
      });
    });

    showScreen("result");
  }

  function gradeText(pct) {
    if (pct >= 90) return "מצוין! אתה מוכן למבחן 🎉";
    if (pct >= 75) return "יפה מאוד — עוד קצת חזרה ואתה שם";
    if (pct >= 60) return "בסיס טוב — כדאי לחזור על הנושאים החלשים";
    if (pct >= 40) return "יש מה לשפר — תרגל עוד סבב";
    return "התחלה טובה — המשך לתרגל!";
  }

  document.getElementById("stat-total").textContent = String(QUESTIONS.length);
  buildTopicChips();
  buildCountOptions();

  document.getElementById("btn-start").addEventListener("click", function () { startQuiz(false); });
  document.getElementById("btn-prev").addEventListener("click", function () { goTo(state.index - 1); });
  document.getElementById("btn-next").addEventListener("click", function () {
    if (state.index < state.deck.length - 1) goTo(state.index + 1);
    else finishQuiz();
  });
  document.getElementById("btn-quit").addEventListener("click", function () {
    if (confirm("לצאת מהבוחן? ההתקדמות בסבב הנוכחי תאבד.")) showScreen("start");
  });
  document.getElementById("btn-again").addEventListener("click", function () { startQuiz(false); });
  document.getElementById("btn-review").addEventListener("click", function () { startQuiz(true); });
  document.getElementById("btn-home").addEventListener("click", function () { showScreen("start"); });
})();
