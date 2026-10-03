/*
 * substackPosts.js
 *
 * SUBSTACK ARCHIVE
 *
 * Substack remains the canonical source of content.
 *
 * This page provides a simple alternate way to browse that work.
 *
 *
 * DESCRIPTION CONVENTION
 *
 * Begin the Substack description with either:
 *
 * Music | Description goes here.
 *
 * or:
 *
 * Writing | Description goes here.
 *
 *
 * Everything before the FIRST "|" is treated as the category.
 * Everything after it is treated as the human-readable description.
 *
 * Examples:
 *
 * Music | A living-room recording of Beat It.
 *
 * Writing | An essay about attention, memory, and being seen.
 *
 *
 * Posts without this convention still appear under All Posts.
 * They simply are not included in the Music or Writing filters.
 */


/* =========================================================
   SETTINGS
   ========================================================= */

const SUBSTACK_FEED = "substack-feed.xml";


/*
 * These are intentionally the only categories for now.
 *
 * Keeping this list explicit means an accidental "|" inside an
 * older description cannot create a strange new archive category.
 *
 * More categories can be added later simply by adding them here.
 */

const CATEGORIES = [
    "Writing",
    "Music"
];


/*
 * Detailed console logging can be useful while building.
 *
 * Change this to false once everything is working reliably.
 */

const DEBUG = true;


/* =========================================================
   APPLICATION STATE
   ========================================================= */

/*
 * allPosts is the single master collection.
 *
 * Filtering never changes this array.
 */

let allPosts = [];


/*
 * null means:
 *
 * Show All Posts
 */

let activeCategory = null;


/* =========================================================
   DEBUGGING
   ========================================================= */

function debugLog(...messages) {

    if (DEBUG) {
        console.log(...messages);
    }
}


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

/*
 * Used when comparing categories.
 *
 * "Music", "music", and " MUSIC " should all mean the same thing.
 */

function normalizeValue(value) {

    return String(value ?? "")
        .trim()
        .toLocaleLowerCase();
}


/* =========================================================
   CLEAN DESCRIPTION
   ========================================================= */

/*
 * RSS descriptions may contain HTML.
 *
 * Convert that HTML into plain text before reading the category
 * and description.
 */

function cleanDescription(descriptionHTML) {

    const container =
        document.createElement("div");

    container.innerHTML =
        descriptionHTML;

    return container.textContent
        .replace(/\s+/g, " ")
        .trim();
}


/* =========================================================
   PARSE DESCRIPTION
   ========================================================= */

/*
 * Expected convention:
 *
 * Music | A living-room recording of Beat It.
 *
 * Writing | An essay about attention and memory.
 *
 *
 * RULE:
 *
 * Everything before the FIRST "|" is a possible category.
 * Everything after the FIRST "|" is the description.
 *
 *
 * Only categories listed in CATEGORIES are accepted.
 *
 * If the description does not begin with a recognized category,
 * the post remains uncategorized and its complete description
 * remains visible.
 */

function parsePostDescription(descriptionHTML) {

    const fullDescription =
        cleanDescription(descriptionHTML);


    /*
     * Empty description.
     */

    if (!fullDescription) {

        return {
            category: null,
            description: ""
        };
    }


    /*
     * Find the FIRST pipe.
     */

    const pipeIndex =
        fullDescription.indexOf("|");


    /*
     * No pipe means there is no structured category.
     *
     * Keep the complete description.
     */

    if (pipeIndex === -1) {

        return {
            category: null,
            description: fullDescription
        };
    }


    /*
     * Separate the possible category from the human description.
     */

    const possibleCategory =
        fullDescription
            .slice(0, pipeIndex)
            .trim();


    const humanDescription =
        fullDescription
            .slice(pipeIndex + 1)
            .trim();


    /*
     * Check whether the category is one we recognize.
     */

    const category =
        CATEGORIES.find(
            item =>
                normalizeValue(item) ===
                normalizeValue(possibleCategory)
        );


    /*
     * A pipe exists, but the text before it is not one of our
     * categories.
     *
     * Treat this like an ordinary description so old posts are
     * not damaged by the new convention.
     */

    if (!category) {

        return {
            category: null,
            description: fullDescription
        };
    }


    /*
     * Valid categorized post.
     */

    return {
        category: category,
        description: humanDescription
    };
}


/* =========================================================
   FIND HERO IMAGE
   ========================================================= */

/*
 * Look for an RSS <enclosure> whose MIME type is an image.
 */

function getPostImage(item) {

    const enclosure =
        item.querySelector("enclosure");


    if (!enclosure) {
        return "";
    }


    const type =
        enclosure.getAttribute("type") ?? "";


    const url =
        enclosure.getAttribute("url") ?? "";


    if (type.startsWith("image/")) {
        return url;
    }


    return "";
}


/* =========================================================
   LOAD POSTS
   ========================================================= */

/*
 * Request the local copy of the Substack RSS feed and convert
 * every <item> into the standard post object used by this page.
 */

async function loadSubstackPosts() {

    if (DEBUG) {

        console.group(
            "SUBSTACK ARCHIVE DEBUG"
        );

        console.log(
            "Feed:",
            SUBSTACK_FEED
        );
    }


    try {

        /* -------------------------------------------------
           1. REQUEST RSS
           ------------------------------------------------- */

        debugLog(
            "1. Requesting RSS feed..."
        );


        const response =
            await fetch(SUBSTACK_FEED);


        debugLog(
            "HTTP status:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                `RSS request failed: ${response.status} ${response.statusText}`
            );
        }


        /* -------------------------------------------------
           2. READ RSS
           ------------------------------------------------- */

        const rssText =
            await response.text();


        debugLog(
            "2. RSS received:",
            rssText.length,
            "characters"
        );


        /* -------------------------------------------------
           3. PARSE XML
           ------------------------------------------------- */

        const parser =
            new DOMParser();


        const rss =
            parser.parseFromString(
                rssText,
                "text/xml"
            );


        const parserError =
            rss.querySelector("parsererror");


        if (parserError) {

            throw new Error(
                "RSS XML could not be parsed."
            );
        }


        debugLog(
            "3. RSS XML parsed successfully."
        );


        /* -------------------------------------------------
           4. FIND RSS ITEMS
           ------------------------------------------------- */

        const items =
            rss.querySelectorAll("item");


        debugLog(
            "4. RSS items found:",
            items.length
        );


        /* -------------------------------------------------
           5. NORMALIZE POSTS
           ------------------------------------------------- */

        const posts =
            Array.from(items).map(
                (item, index) => {


                    const descriptionHTML =
                        item.querySelector("description")
                            ?.textContent ?? "";


                    const parsedDescription =
                        parsePostDescription(
                            descriptionHTML
                        );


                    const post = {

                        title:
                            item.querySelector("title")
                                ?.textContent
                                ?.trim() ?? "",

                        date:
                            item.querySelector("pubDate")
                                ?.textContent
                                ?.trim() ?? "",

                        url:
                            item.querySelector("link")
                                ?.textContent
                                ?.trim() ?? "",

                        image:
                            getPostImage(item),

                        category:
                            parsedDescription.category,

                        description:
                            parsedDescription.description
                    };


                    /* -------------------------------------
                       DEBUG INDIVIDUAL POST
                       ------------------------------------- */

                    if (DEBUG) {

                        console.groupCollapsed(
                            `POST ${index + 1}: ${post.title}`
                        );

                        console.log(
                            "Category:",
                            post.category ?? "Uncategorized"
                        );

                        console.log(
                            "Description:",
                            post.description
                        );

                        console.log(
                            "Raw RSS description:",
                            descriptionHTML
                        );

                        console.groupEnd();
                    }


                    return post;
                }
            );


        /* -------------------------------------------------
           6. SUMMARY
           ------------------------------------------------- */

        if (DEBUG) {

            console.log(
                `5. ${posts.length} posts normalized.`
            );


            console.table(

                posts.map(post => ({

                    title:
                        post.title,

                    category:
                        post.category ?? "Uncategorized",

                    description:
                        post.description
                }))
            );
        }


        return posts;


    } catch (error) {

        if (DEBUG) {

            console.error(
                "SUBSTACK LOAD FAILED"
            );

            console.error(
                error
            );
        }


        throw error;


    } finally {

        if (DEBUG) {
            console.groupEnd();
        }
    }
}


/* =========================================================
   COUNT POSTS
   ========================================================= */

/*
 * Count how many posts belong to one category.
 */

function countPostsByCategory(
    posts,
    category
) {

    return posts.filter(
        post =>
            normalizeValue(post.category) ===
            normalizeValue(category)
    ).length;
}


/* =========================================================
   FILTER POSTS
   ========================================================= */

/*
 * No category means:
 *
 * All Posts
 *
 * Otherwise return posts belonging to the selected category.
 */

function filterPosts(
    posts,
    category
) {

    if (!category) {
        return [...posts];
    }


    return posts.filter(
        post =>
            normalizeValue(post.category) ===
            normalizeValue(category)
    );
}


/* =========================================================
   SET ACTIVE CATEGORY
   ========================================================= */

/*
 * Every navigation click comes through here.
 */

function setActiveCategory(category = null) {

    activeCategory =
        category;


    const visiblePosts =
        filterPosts(
            allPosts,
            activeCategory
        );


    debugLog(
        "Filter changed:",
        activeCategory ?? "All Posts"
    );


    debugLog(
        `Displaying ${visiblePosts.length} / ${allPosts.length} posts`
    );


    displayPosts(
        visiblePosts
    );


    /*
     * Rebuild navigation so the active button stays synchronized.
     */

    buildNavigation(
        allPosts
    );
}


/* =========================================================
   CREATE FILTER BUTTON
   ========================================================= */

function createFilterButton(
    label,
    category,
    count
) {

    const button =
        document.createElement("button");


    button.type =
        "button";


    button.className =
        "archive-filter";


    /*
     * Determine whether this is the current selection.
     */

    const isActive =
        category === null

            ? activeCategory === null

            : normalizeValue(activeCategory) ===
            normalizeValue(category);


    if (isActive) {

        button.classList.add(
            "is-active"
        );

        button.setAttribute(
            "aria-current",
            "true"
        );
    }


    /*
     * Label.
     */

    const labelElement =
        document.createElement("span");


    labelElement.className =
        "archive-filter-label";


    labelElement.textContent =
        label;


    button.appendChild(
        labelElement
    );


    /*
     * Post count.
     */

    const countElement =
        document.createElement("span");


    countElement.className =
        "archive-filter-count";


    countElement.textContent =
        count;


    countElement.setAttribute(
        "aria-hidden",
        "true"
    );


    button.appendChild(
        countElement
    );


    /*
     * Filter when clicked.
     */

    button.addEventListener(
        "click",
        () => {

            setActiveCategory(
                category
            );
        }
    );


    return button;
}


/* =========================================================
   BUILD NAVIGATION
   ========================================================= */

/*
 * Navigation is intentionally simple:
 *
 * All Posts
 *
 * MEDIUM
 * Writing
 * Music
 *
 *
 * Writing and Music always appear.
 *
 * This means the interface remains stable even while older posts
 * are gradually being updated to the new description convention.
 */

function buildNavigation(posts) {

    const navigation =
        document.getElementById(
            "archive-navigation"
        );


    if (!navigation) {

        console.error(
            "Archive HTML is missing #archive-navigation."
        );

        return;
    }


    navigation.innerHTML = "";


    /* -----------------------------------------------------
       ALL POSTS
       ----------------------------------------------------- */

    const allPostsButton =
        createFilterButton(
            "All Posts",
            null,
            posts.length
        );


    allPostsButton.classList.add(
        "archive-filter-all"
    );


    navigation.appendChild(
        allPostsButton
    );


    /* -----------------------------------------------------
       MEDIUM
       ----------------------------------------------------- */

    const section =
        document.createElement("section");


    section.className =
        "archive-filter-group";


    const heading =
        document.createElement("h2");


    heading.className =
        "archive-filter-heading";


    heading.textContent =
        "Medium";


    section.appendChild(
        heading
    );


    const list =
        document.createElement("div");


    list.className =
        "archive-filter-list";


    CATEGORIES.forEach(category => {

        const count =
            countPostsByCategory(
                posts,
                category
            );


        const button =
            createFilterButton(
                category,
                category,
                count
            );


        list.appendChild(
            button
        );
    });


    section.appendChild(
        list
    );


    navigation.appendChild(
        section
    );
}


/* =========================================================
   DISPLAY POSTS
   ========================================================= */

/*
 * This function only renders the collection it receives.
 *
 * It does not decide which posts belong to a category.
 */

function displayPosts(posts) {

    const container =
        document.getElementById("posts");


    const status =
        document.getElementById("status");


    if (!container || !status) {

        console.error(
            "Archive HTML is missing #posts or #status."
        );

        return;
    }


    container.innerHTML = "";


    /* -----------------------------------------------------
       NO RESULTS
       ----------------------------------------------------- */

    if (posts.length === 0) {

        status.style.display =
            "block";


        status.textContent =
            "No posts found.";


        return;
    }


    /* -----------------------------------------------------
       POSTS EXIST
       ----------------------------------------------------- */

    status.style.display =
        "none";


    /*
     * Sort newest → oldest without changing allPosts.
     */

    const sortedPosts =
        [...posts].sort(
            (a, b) => {

                const dateA =
                    new Date(a.date).getTime();


                const dateB =
                    new Date(b.date).getTime();


                if (
                    Number.isNaN(dateA) ||
                    Number.isNaN(dateB)
                ) {

                    return 0;
                }


                return dateB - dateA;
            }
        );


    sortedPosts.forEach(post => {


        /* -------------------------------------------------
           POST LINK
           ------------------------------------------------- */

        const link =
            document.createElement("a");


        link.className =
            "post";


        link.href =
            post.url;


        link.target =
            "_blank";


        link.rel =
            "noopener noreferrer";


        /* -------------------------------------------------
           HERO IMAGE
           ------------------------------------------------- */

        if (post.image) {

            const image =
                document.createElement("img");


            image.className =
                "post-image";


            image.src =
                post.image;


            image.alt =
                "";


            image.loading =
                "lazy";


            image.decoding =
                "async";


            link.appendChild(
                image
            );
        }


        /* -------------------------------------------------
           TITLE
           ------------------------------------------------- */

        const title =
            document.createElement("p");


        title.className =
            "post-title";


        title.textContent =
            post.title;


        link.appendChild(
            title
        );


        /* -------------------------------------------------
           DATE
           ------------------------------------------------- */

        const date =
            document.createElement("p");


        date.className =
            "post-date";


        const parsedDate =
            new Date(post.date);


        if (
            !Number.isNaN(
                parsedDate.getTime()
            )
        ) {

            date.textContent =
                parsedDate.toLocaleDateString(
                    "en-US",
                    {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    }
                );

        } else {

            date.textContent =
                post.date;
        }


        link.appendChild(
            date
        );


        /* -------------------------------------------------
           DESCRIPTION
           ------------------------------------------------- */

        if (post.description) {

            const description =
                document.createElement("p");


            description.className =
                "post-description";


            description.textContent =
                post.description;


            link.appendChild(
                description
            );
        }


        container.appendChild(
            link
        );
    });
}


/* =========================================================
   START PAGE
   ========================================================= */

/*
 * 1. Load the RSS feed once.
 * 2. Store the posts.
 * 3. Build All / Writing / Music navigation.
 * 4. Display every post.
 *
 * Filtering after this happens entirely in the browser.
 */

async function startPage() {

    const status =
        document.getElementById("status");


    try {

        allPosts =
            await loadSubstackPosts();


        buildNavigation(
            allPosts
        );


        displayPosts(
            allPosts
        );


        debugLog(
            `Archive ready. Displaying ${allPosts.length} posts.`
        );


    } catch (error) {

        console.error(
            "Could not start Substack archive:",
            error
        );


        if (status) {

            status.style.display =
                "block";


            status.textContent =
                "Could not load posts.";
        }
    }
}


/* =========================================================
   RUN
   ========================================================= */

startPage();