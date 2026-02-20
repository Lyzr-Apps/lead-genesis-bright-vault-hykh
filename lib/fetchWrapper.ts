const fetchWrapper = async (...args) => {
  try {
    const response = await fetch(...args);

    // if backend sent a redirect
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    if (response.status == 404) {
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/html")) {
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
        return;
      }
    }

    // Return the response for ALL status codes (including 500+)
    // Let the caller handle errors gracefully without reloading the page
    return response;
  } catch (error) {
    // Network failures — return undefined so callers can handle gracefully
    // DO NOT reload the page — this destroys in-memory state
    console.error('fetchWrapper network error:', error);
    return undefined;
  }
};

export default fetchWrapper;
