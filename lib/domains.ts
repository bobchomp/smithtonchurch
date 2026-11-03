// Where the website and admin panel live. While the site is being developed it runs on
// rossmdev.co.uk; when it moves to smithtonchurch.com, change SITE_HOST and ADMIN_HOST here
// (and `url` in content/site.yml if it isn't already right).
export const SITE_HOST: string = "rossmdev.co.uk";
export const ADMIN_HOST = "admin.rossmdev.co.uk";

// Every address the public website answers on. /admin on any of these goes to ADMIN_HOST.
export const MAIN_HOSTS = [SITE_HOST, `www.${SITE_HOST}`, "smithtonchurch.com", "www.smithtonchurch.com"];

// While the site is on the development domain, ask search engines not to list it.
// This switches off by itself once SITE_HOST is changed to smithtonchurch.com.
export const HIDE_FROM_SEARCH_ENGINES = SITE_HOST !== "smithtonchurch.com";
