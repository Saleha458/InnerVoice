const QUICK_EXIT_DESTINATIONS = {
  sports: {
    name: "ESPN",
    url: "https://www.espn.com/",
  },

  games: {
    name: "Poki",
    url: "https://poki.com/",
  },

  reading: {
    name: "Project Gutenberg",
    url: "https://www.gutenberg.org/",
  },

  articles: {
    name: "BBC",
    url: "https://www.bbc.com/",
  },

  recipes: {
    name: "Allrecipes",
    url: "https://www.allrecipes.com/",
  },

  study: {
    name: "Khan Academy",
    url: "https://www.khanacademy.org/",
  },
};

const FALLBACK_DESTINATIONS = [
  QUICK_EXIT_DESTINATIONS.sports,
  QUICK_EXIT_DESTINATIONS.games,
  QUICK_EXIT_DESTINATIONS.reading,
  QUICK_EXIT_DESTINATIONS.articles,
  QUICK_EXIT_DESTINATIONS.recipes,
  QUICK_EXIT_DESTINATIONS.study,
];

export const getQuickExitDestinations = () => {
  return QUICK_EXIT_DESTINATIONS;
};

export const getQuickExitPreference = () => {
  return (
    localStorage.getItem("innervoice_quick_exit_preference") ||
    "reading"
  );
};

export const setQuickExitPreference = (preference) => {
  if (!QUICK_EXIT_DESTINATIONS[preference]) {
    return;
  }

  localStorage.setItem(
    "innervoice_quick_exit_preference",
    preference
  );
};

export const quickExit = (preference) => {
  const selectedPreference =
    preference || getQuickExitPreference();

  const destination =
    QUICK_EXIT_DESTINATIONS[selectedPreference];

  const finalDestination =
    destination ||
    FALLBACK_DESTINATIONS[
      Math.floor(
        Math.random() *
          FALLBACK_DESTINATIONS.length
      )
    ];

  /*
   * Save preference before leaving.
   */
  if (selectedPreference) {
    setQuickExitPreference(
      selectedPreference
    );
  }

  /*
   * Replace current page instead of opening
   * another tab.
   */
  window.location.replace(
    finalDestination.url
  );
};

export default quickExit;