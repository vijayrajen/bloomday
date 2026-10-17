/* BloomDay daily motivation: deterministic, offline, no API or account required. */
(function () {
  'use strict';
  const openers = [
    'Give yourself credit for', 'Today is a fresh chance to', 'You are allowed to', 'Let today be a reminder to',
    'Your future self will thank you for', 'A little progress comes from', 'Choose kindness as you',
    'You do not need perfection to', 'Make room today for', 'Every small choice can help you',
    'Be proud that you are', 'Take a gentle step toward', 'You can begin again by',
    'Consistency grows when you', 'Let your effort today be about', 'Your wellbeing deserves',
    'Small habits make space for', 'Give yourself permission to', 'One thoughtful choice can',
    'You are building trust with yourself by', 'Celebrate the courage it takes to', 'A calmer day can start when you',
    'Keep your focus on', 'Your pace is valid as you', 'Let progress—not pressure—guide you to'
  ];
  const endings = [
    'showing up for yourself.', 'choosing the next helpful step.', 'making time for your health.',
    'nourishing your body with care.', 'moving in a way that feels good.', 'resting when you need it.',
    'learning something new.', 'returning to a habit after a busy day.', 'speaking to yourself with kindness.',
    'celebrating effort, not just outcomes.', 'taking things one step at a time.', 'making a choice that supports your goals.',
    'keeping promises small and realistic.', 'finding joy in ordinary moments.', 'honouring the progress you have made.'
  ];
  const messages = [];
  for (let i = 0; i < openers.length && messages.length < 365; i++) {
    for (let j = 0; j < endings.length && messages.length < 365; j++) {
      messages.push(openers[i] + ' ' + endings[(j + i) % endings.length]);
    }
  }
  // Stable local-calendar day index: refreshing the app never changes today's message.
  function dayIndex(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor((today - start) / 86400000) - 1;
  }
  function todaysMessages() {
    const index = ((dayIndex(new Date()) % messages.length) + messages.length) % messages.length;
    return {
      hero: messages[index],
      encouragement: messages[(index + 137) % messages.length]
    };
  }
  const ORIGINAL_HERO = 'Small steps count. Take care of yourself today, and let consistency do the rest.';
  const ORIGINAL_ENCOURAGEMENT = "💗 You don't have to do everything perfectly. Just return to your habits, one day at a time.";
  
function applyMessages() {
  const daily = todaysMessages();
  const heroText = document.querySelector('.hero p');
  if (
    heroText &&
    (
      heroText.textContent.trim() === ORIGINAL_HERO ||
      heroText.dataset.dailyMotivation === 'true'
    )
  ) {
    if (heroText.textContent !== daily.hero) {
      heroText.textContent = daily.hero;
    }
    heroText.dataset.dailyMotivation = 'true';
  }
  document.querySelectorAll('.info-banner').forEach(function (banner) {
    const text = banner.textContent.trim();
    const newText = '💗 ' + daily.encouragement;
    if (
      text === ORIGINAL_ENCOURAGEMENT ||
      banner.dataset.dailyMotivation === 'true'
    ) {
      if (text !== newText) {
        banner.textContent = newText;
      }
      banner.dataset.dailyMotivation = 'true';
    }
  });
}
  applyMessages();
  const observer = new MutationObserver(applyMessages);
  observer.observe(document.body, { childList: true, subtree: true });
})();
