(() => {

  "use strict";


  /* ============================================================
     EMOTIONS
  ============================================================ */

  const EMOTIONS = {

    sadness: {
      emoji: "😢",
      caption: "melancholy signal detected"
    },

    joy: {
      emoji: "😄",
      caption: "positive energy detected"
    },

    love: {
      emoji: "❤️",
      caption: "affection signal detected"
    },

    anger: {
      emoji: "😠",
      caption: "intense signal detected"
    },

    fear: {
      emoji: "😨",
      caption: "anxiety signal detected"
    },

    surprise: {
      emoji: "😲",
      caption: "unexpected signal detected"
    }

  };


  /* ============================================================
     DOM
  ============================================================ */

  const el = {

    statusDot:
      document.getElementById("statusDot"),

    serverStatusText:
      document.getElementById("serverStatusText"),

    textInput:
      document.getElementById("textInput"),

    charCount:
      document.getElementById("charCount"),

    analyzeBtn:
      document.getElementById("analyzeBtn"),

    errorMsg:
      document.getElementById("errorMsg"),

    orb:
      document.getElementById("orb"),

    orbEmoji:
      document.getElementById("orbEmoji"),

    orbCaption:
      document.getElementById("orbCaption"),

    resultSection:
      document.getElementById("resultSection"),

    emotionWord:
      document.getElementById("emotionWord"),

    emotionEmoji:
      document.getElementById("emotionEmoji"),

    confidenceText:
      document.getElementById("confidenceText"),

    confidenceNumber:
      document.getElementById("confidenceNumber"),

    confidenceProgress:
      document.getElementById("confidenceProgress"),

    echoedText:
      document.getElementById("echoedText"),

    barsContainer:
      document.getElementById("barsContainer")

  };


  let modelReady = false;
  let healthTimer = null;


  /* ============================================================
     HEALTH CHECK
  ============================================================ */

  async function checkHealth() {

    try {

      const response =
        await fetch("/health", {
          cache: "no-store"
        });


      if (!response.ok) {

        throw new Error(
          `Server returned ${response.status}`
        );

      }


      const data =
        await response.json();


      modelReady =
        Boolean(data.model_loaded);


      if (modelReady) {

        setStatus(
          "live",
          "model ready — say something"
        );

        el.orbCaption.textContent =
          "waiting for input";

      }

      else {

        setStatus(
          "warming",
          "waking the model up…"
        );

        el.orbCaption.textContent =
          "neural core warming";

        scheduleHealthCheck(3000);

      }


    }

    catch (error) {

      modelReady = false;

      setStatus(
        "down",
        "can't reach the server"
      );

      el.orbCaption.textContent =
        "server unavailable";

      scheduleHealthCheck(5000);

    }


    syncButtonState();

  }


  function scheduleHealthCheck(delay) {

    clearTimeout(healthTimer);

    healthTimer =
      setTimeout(
        checkHealth,
        delay
      );

  }


  function setStatus(
    type,
    message
  ) {

    el.statusDot.className =
      `status-dot ${type}`;

    el.serverStatusText.textContent =
      message;

  }


  /* ============================================================
     INPUT
  ============================================================ */

  el.textInput.addEventListener(
    "input",
    () => {

      const length =
        el.textInput.value.length;

      el.charCount.textContent =
        length.toLocaleString();

      syncButtonState();

      hideError();


      if (length > 0 && modelReady) {

        el.orbCaption.textContent =
          "ready to analyze";

      }

      else if (modelReady) {

        el.orbCaption.textContent =
          "waiting for input";

      }

    }
  );


  el.textInput.addEventListener(
    "focus",
    () => {

      if (!el.orb.classList.contains("thinking")) {

        el.orbCaption.textContent =
          "listening...";

      }

    }
  );


  el.textInput.addEventListener(
    "blur",
    () => {

      if (
        !el.textInput.value.trim() &&
        modelReady
      ) {

        el.orbCaption.textContent =
          "waiting for input";

      }

    }
  );


  el.textInput.addEventListener(
    "keydown",
    event => {

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter"
      ) {

        event.preventDefault();

        runAnalysis();

      }

    }
  );


  function syncButtonState() {

    const hasText =
      el.textInput.value.trim().length > 0;


    el.analyzeBtn.disabled =
      !hasText ||
      !modelReady;

  }


  el.analyzeBtn.addEventListener(
    "click",
    runAnalysis
  );


  /* ============================================================
     ANALYSIS
  ============================================================ */

  async function runAnalysis() {

    const text =
      el.textInput.value.trim();


    if (!text || !modelReady) {

      return;

    }


    hideError();

    enterThinking();


    try {

      const response =
        await fetch(
          "/predict",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              text
            })
          }
        );


      let data = {};


      try {

        data =
          await response.json();

      }

      catch {

        data = {};

      }


      if (!response.ok) {

        const detail =
          typeof data.detail === "string"
            ? data.detail
            : `Request failed (${response.status}).`;

        throw new Error(detail);

      }


      if (!data.predicted_emotion) {

        throw new Error(
          "The model returned an invalid response."
        );

      }


      renderResult(
        data,
        text
      );

    }


    catch (error) {

      exitThinking(false);

      showError(
        error.message ||
        "Something went wrong. Try again."
      );

    }

  }


  /* ============================================================
     THINKING STATE
  ============================================================ */

  function enterThinking() {

    el.analyzeBtn.classList.add(
      "loading"
    );

    el.analyzeBtn.querySelector(
      ".btn-label"
    ).textContent =
      "Reading…";


    el.analyzeBtn.disabled = true;


    el.orb.classList.remove(
      "settled"
    );

    el.orb.classList.add(
      "thinking"
    );


    el.orbEmoji.style.opacity =
      "0";


    el.orbCaption.textContent =
      "reading emotional signal";

  }


  function exitThinking(success) {

    el.analyzeBtn.classList.remove(
      "loading"
    );


    el.analyzeBtn.querySelector(
      ".btn-label"
    ).textContent =
      "Read the mood";


    el.orb.classList.remove(
      "thinking"
    );


    syncButtonState();


    if (!success) {

      el.orbEmoji.textContent =
        "✦";

      el.orbEmoji.style.opacity =
        "1";

      el.orbCaption.textContent =
        "analysis interrupted";

    }

  }


  /* ============================================================
     RENDER RESULT
  ============================================================ */

  function renderResult(
    data,
    originalText
  ) {

    const emotion =
      String(
        data.predicted_emotion
      ).toLowerCase();


    const emotionData =
      EMOTIONS[emotion] ||
      {
        emoji: "🙂",
        caption: "emotional signal detected"
      };


    const confidence =
      clamp(
        Number(data.confidence) || 0,
        0,
        1
      );


    /* Dynamic theme */

    document.body.setAttribute(
      "data-emotion",
      emotion
    );


    /* Orb */

    el.orb.classList.add(
      "settled"
    );

    el.orbEmoji.textContent =
      emotionData.emoji;

    el.orbEmoji.style.opacity =
      "1";

    el.orbCaption.textContent =
      emotionData.caption;


    exitThinking(true);


    /* Emotion */

    el.emotionWord.textContent =
      capitalize(emotion);

    el.emotionEmoji.textContent =
      emotionData.emoji;


    /* Confidence */

    const confidencePercent =
      confidence * 100;


    el.confidenceText.textContent =
      `${confidencePercent.toFixed(1)}% confidence`;


    animateConfidence(
      confidencePercent
    );


    /* Echo */

    el.echoedText.textContent =
      `“${originalText}”`;


    /* Probability bars */

    renderBars(
      data.all_probabilites ||
      data.all_probabilities ||
      {}
    );


    /* Show result */

    el.resultSection.hidden =
      false;


    el.resultSection.classList.remove(
      "entering"
    );


    void el.resultSection.offsetWidth;


    el.resultSection.classList.add(
      "entering"
    );


    setTimeout(() => {

      el.resultSection.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });

    }, 100);

  }


  /* ============================================================
     CONFIDENCE ANIMATION
  ============================================================ */

  function animateConfidence(
    percent
  ) {

    const circumference =
      2 * Math.PI * 42;


    const offset =
      circumference -
      (percent / 100) *
      circumference;


    el.confidenceProgress.style.strokeDasharray =
      circumference;


    el.confidenceProgress.style.strokeDashoffset =
      circumference;


    requestAnimationFrame(() => {

      el.confidenceProgress.style.strokeDashoffset =
        offset;

    });


    animateNumber(
      0,
      percent,
      1000
    );

  }


  function animateNumber(
    from,
    to,
    duration
  ) {

    const start =
      performance.now();


    function update(now) {

      const progress =
        Math.min(
          (now - start) / duration,
          1
        );


      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );


      const value =
        from +
        (to - from) *
        eased;


      el.confidenceNumber.textContent =
        `${value.toFixed(0)}%`;


      if (progress < 1) {

        requestAnimationFrame(
          update
        );

      }

    }


    requestAnimationFrame(
      update
    );

  }


  /* ============================================================
     PROBABILITY BARS
  ============================================================ */

  function renderBars(
    probabilities
  ) {

    const entries =
      Object.entries(
        probabilities
      )
      .filter(
        ([, value]) =>
          Number.isFinite(
            Number(value)
          )
      )
      .sort(
        (a,b) =>
          Number(b[1]) -
          Number(a[1])
      );


    el.barsContainer.innerHTML =
      "";


    entries.forEach(
      ([label, value], index) => {

        const safeValue =
          clamp(
            Number(value),
            0,
            1
          );


        const percent =
          safeValue * 100;


        const emotion =
          EMOTIONS[label];


        const row =
          document.createElement(
            "div"
          );


        row.className =
          `bar-row bar-${label}`;


        const labelSpan =
          document.createElement(
            "span"
          );

        labelSpan.className =
          "bar-label";

        labelSpan.textContent =
          `${emotion?.emoji || ""} ${label}`;


        const track =
          document.createElement(
            "span"
          );

        track.className =
          "bar-track";


        const fill =
          document.createElement(
            "span"
          );

        fill.className =
          "bar-fill";


        const percentage =
          document.createElement(
            "span"
          );

        percentage.className =
          "bar-pct";

        percentage.textContent =
          `${percent.toFixed(1)}%`;


        track.appendChild(
          fill
        );


        row.appendChild(
          labelSpan
        );

        row.appendChild(
          track
        );

        row.appendChild(
          percentage
        );


        el.barsContainer.appendChild(
          row
        );


        setTimeout(
          () => {

            fill.style.width =
              `${percent}%`;

          },
          100 + index * 90
        );

      }
    );

  }


  /* ============================================================
     HELPERS
  ============================================================ */

  function clamp(
    value,
    min,
    max
  ) {

    return Math.min(
      Math.max(
        value,
        min
      ),
      max
    );

  }


  function capitalize(
    text
  ) {

    if (!text) {
      return "";
    }

    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );

  }


  function showError(
    message
  ) {

    el.errorMsg.textContent =
      message;

    el.errorMsg.hidden =
      false;

  }


  function hideError() {

    el.errorMsg.hidden =
      true;

  }


  /* ============================================================
     BOOT
  ============================================================ */

  checkHealth();

})();