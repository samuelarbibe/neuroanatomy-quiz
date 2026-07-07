(function () {
  "use strict";

  var COUNT_OPTIONS = [10, 20, 30, 50, 100];

  var state = {
    topic: "all",
    count: 20,
    deck: [],
    index: 0,
    correct: 0,
    answered: false,
    history: []
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
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn" + (n === state.count || (n > max && state.count > max) ? " primary" : "");
      btn.dataset.count = String(Math.min(n, max));
      btn.textContent = n > max ? String(max) + " (הכל)" : String(n);
      if (Math.min(n, max) === state.count || (n > max && state.count >= max)) {
        btn.classList.add("primary");
        state.count = Math.min(n, max);
      }
      wrap.appendChild(btn);
    });

    if (!wrap.querySelector(".primary")) {
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

  function startQuiz() {
    var pool = filterQuestions(state.topic);
    if (!pool.length) return;

    state.deck = shuffle(pool).slice(0, Math.min(state.count, pool.length));
    state.index = 0;
    state.correct = 0;
    state.history = [];
    state.answered = false;

    showScreen("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    var q = state.deck[state.index];
    var meta = TOPICS[q.topic];
    var total = state.deck.length;
    var num = state.index + 1;

    document.getElementById("progress-fill").style.width = ((num - 1) / total * 100) + "%";
    document.getElementById("progress-label").textContent = "שאלה " + num + " מתוך " + total;
    document.getElementById("score-pill").textContent = state.correct + " נכונות";
    document.getElementById("q-topic").textContent = (meta ? meta.emoji + " " + meta.label : q.topic);
    document.getElementById("q-text").textContent = q.q;

    var optsWrap = document.getElementById("q-options");
    optsWrap.innerHTML = "";

    var letters = ["א", "ב", "ג", "ד"];
    var shuffled = q.opts.map(function (text, i) {
      return { text: text, orig: i };
    });
    shuffled = shuffle(shuffled);

    shuffled.forEach(function (item, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.innerHTML = "<span>" + letters[i] + ". " + item.text + "</span>";
      btn.dataset.orig = String(item.orig);
      btn.addEventListener("click", function () { answer(btn, q, parseInt(btn.dataset.orig, 10)); });
      optsWrap.appendChild(btn);
    });

    var expl = document.getElementById("q-explain");
    expl.className = "explain";
    expl.classList.remove("show", "good", "bad");
    document.getElementById("q-verdict").textContent = "";
    document.getElementById("q-explain-text").textContent = "";

    var nextBtn = document.getElementById("btn-next");
    nextBtn.disabled = true;
    nextBtn.textContent = state.index < total - 1 ? "הבא ←" : "סיום הבוחן ←";
    state.answered = false;
  }

  function answer(btn, q, chosenOrig) {
    if (state.answered) return;
    state.answered = true;

    var isCorrect = chosenOrig === q.correct;
    if (isCorrect) state.correct++;

    document.getElementById("score-pill").textContent = state.correct + " נכונות";

    var buttons = document.querySelectorAll("#q-options .opt");
    buttons.forEach(function (b) {
      b.disabled = true;
      var orig = parseInt(b.dataset.orig, 10);
      if (orig === q.correct) b.classList.add("correct");
      else if (b === btn && !isCorrect) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    var expl = document.getElementById("q-explain");
    expl.classList.add("show", isCorrect ? "good" : "bad");
    document.getElementById("q-verdict").textContent = isCorrect ? "✓ נכון!" : "✗ לא מדויק";
    document.getElementById("q-explain-text").textContent = q.expl;

    state.history.push({
      q: q.q,
      topic: q.topic,
      chosen: q.opts[chosenOrig],
      correct: q.opts[q.correct],
      ok: isCorrect,
      expl: q.expl
    });

    document.getElementById("btn-next").disabled = false;
    document.getElementById("progress-fill").style.width = ((state.index + 1) / state.deck.length * 100) + "%";
  }

  function finishQuiz() {
    var total = state.deck.length;
    var pct = total ? Math.round(state.correct / total * 100) : 0;

    document.getElementById("result-score").textContent = state.correct + " / " + total;
    document.getElementById("result-grade").textContent = gradeText(pct);

    var review = document.getElementById("review-wrap");
    review.innerHTML = "";

    if (state.history.some(function (h) { return !h.ok; })) {
      var title = document.createElement("h3");
      title.textContent = "סקירת טעויות";
      title.style.margin = "24px 0 12px";
      review.appendChild(title);

      state.history.forEach(function (h, i) {
        if (h.ok) return;
        var item = document.createElement("div");
        item.className = "review-item";
        var meta = TOPICS[h.topic];
        item.innerHTML =
          "<div class=\"rq\">" + (i + 1) + ". " + h.q + "</div>" +
          "<div class=\"ra bad\">בחרת: " + h.chosen + "</div>" +
          "<div class=\"ra good\">נכון: " + h.correct + "</div>" +
          "<div class=\"re\">" + (meta ? meta.label + " · " : "") + h.expl + "</div>";
        review.appendChild(item);
      });
    }

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

  document.getElementById("btn-start").addEventListener("click", startQuiz);
  document.getElementById("btn-next").addEventListener("click", function () {
    if (state.index < state.deck.length - 1) {
      state.index++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  });
  document.getElementById("btn-quit").addEventListener("click", function () {
    if (state.answered || confirm("לצאת מהבוחן? ההתקדמות בסבב הנוכחי תאבד.")) {
      showScreen("start");
    }
  });
  document.getElementById("btn-again").addEventListener("click", startQuiz);
  document.getElementById("btn-home").addEventListener("click", function () { showScreen("start"); });
})();
