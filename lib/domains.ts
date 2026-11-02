// Where the website and admin panel live. While the site is being developed it runs on
// rossmdev.co.uk; when it moves to smithtonchurch.com, change SITE_HOST and ADMIN_HOST here
// (and `url` in content/site.yml if it isn't already right).
export const SITE_HOST = "rossmdev.co.uk";
export const ADMIN_HOST = "admin.rossmdev.co.uk";

// Every address the public website answers on. /admin on any of these goes to ADMIN_HOST.
export const MAIN_HOSTS = [SITE_HOST, `www.${SITE_HOST}`, "smithtonchurch.com", "www.smithtonchurch.com"];
