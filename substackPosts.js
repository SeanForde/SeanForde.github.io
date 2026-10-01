/*
 * substackPosts.js
 *
 * THE BRAIN OF THE SUBSTACK ARCHIVE
 *
 * Substack remains the canonical source of content.
 * This file:
 *
 * 1. Loads the Substack RSS feed.
 * 2. Converts RSS items into standard post objects.
 * 3. Reads structured metadata from descriptions.
 * 4. Discovers available archive categories automatically.
 * 5. Counts how many posts belong to each category.
 * 6. Builds archive navigation when the HTML provides it.
 * 7. Filters the master post collection.
 * 8. Displays the appropriate posts.
 *
 *
 * DATA FLOW
 *
 * Substack RSS
 *      ↓
 * loadSubstackPosts()
 *      ↓
 * allPosts
 *      ↓
 * ┌────────────────────┐
 * │                    │
 * ↓                    ↓
 * buildArchiveData()   displayPosts()
 * ↓
 * navigation
 *
 *
 * DESCRIPTION CONVENTION
 *
 * First line:
 *
 * Medium | Format | State | Topic
 *
 * Example:
 *
 * Music, Visual Art | Song, Drawing | Voice Memo | Family, Creativity
 *
 * I recorded this at the kitchen table while the kids were drawing.
 *
 *
 * Multiple values inside one dimension are separated by commas.
 *
 * Empty dimensions are allowed:
 *
 * Writing | Essay | | Attention
 */


/* =========================================================
   SETTINGS
   ========================================================= */

const SUBSTACK_FEED =
    "substack-feed.xml";

/*
 * Turn detailed console information on or off.
 */

const DEBUG = true;


/*
 * These are the four dimensions understood by the archive.
 *
 * The keys match the properties stored on each post.
 * The labels are what visitors will eventually see.
 */

const ARCHIVE_DIMENSIONS = [
    {
        key: "medium",
        label: "Medium"
    },
    {
        key: "format",
        label: "Format"
    },
    {
        key: "state",
        label: "State"
    },
    {
        key: "topic",
        label: "Topic"
    }
];


/* =========================================================
   APPLICATION STATE

   allPosts is the single master collection.

   We do NOT create separate permanent collections for
   music, essays, poems, etc.

   Those views are always derived from allPosts.
   ========================================================= */

let allPosts = [];


/*
 * null + null means:
 *
 * Show All Posts
 */

let activeFilter = {
    dimension: null,
    value: null
};


/* =========================================================
   DEBUGGING
   ========================================================= */

function debugLog(...messages) {

    if (DEBUG) {
        console.log(...messages);
    }
}


/* =========================================================
   NORMALIZE VALUE

   Used when comparing metadata.

   Visitors should not get different results because one
   description says "Voice Memo" and another accidentally
   says "voice memo".

   We preserve the original label for display, but compare
   normalized versions internally.
   ========================================================= */

function normalizeValue(value) {

    return String(value ?? "")
        .trim()
        .toLocaleLowerCase();
}


/* =========================================================
   PARSE LIST

   Convert:

   "Music, Visual Art"

   into:

   ["Music", "Visual Art"]
   ========================================================= */

function parseList(value) {

    if (!value) {
        return [];
    }


    /*
     * Remove duplicates inside the same metadata field while
     * preserving the first version of the label encountered.
     */

    const values = value
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== "");


    const uniqueValues = [];
    const seenValues = new Set();


    values.forEach(item => {

        const normalized =
            normalizeValue(item);


        if (!seenValues.has(normalized)) {

            seenValues.add(normalized);

            uniqueValues.push(item);
        }
    });


    return uniqueValues;
}


/* =========================================================
   CLEAN DESCRIPTION

   RSS descriptions may contain HTML.

   Convert the HTML into plain text before attempting
   to read metadata.
   ========================================================= */

function cleanDescription(descriptionHTML) {

    const container =
        document.createElement("div");


    container.innerHTML =
        descriptionHTML;


    return container.textContent.trim();
}


/* =========================================================
   PARSE DESCRIPTION

   Expected first line:

   Medium | Format | State | Topic

   Older posts without structured metadata still work.
   Their metadata arrays remain empty and their complete
   description remains visible.
   ========================================================= */

function parsePostDescription(descriptionHTML) {

    const description =
        cleanDescription(descriptionHTML);


    if (!description) {

        return {
            medium: [],
            format: [],
            state: [],
            topic: [],
            description: "",
            metadataFound: false
        };
    }


    /*
     * Split the description into non-empty lines.
     */

    const lines = description
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line !== "");


    const metadataLine =
        lines[0] ?? "";


    const metadataParts = metadataLine
        .split("|")
        .map(part => part.trim());


    /*
     * Our convention requires exactly four dimensions.
     */

    const metadataFound =
        metadataParts.length === 4;


    /*
     * Backward compatibility:
     *
     * If this is an older post, keep the whole description
     * and simply leave metadata empty.
     */

    if (!metadataFound) {

        return {
            medium: [],
            format: [],
            state: [],
            topic: [],
            description: description,
            metadataFound: false
        };
    }


    const humanDescription = lines
        .slice(1)
        .join(" ");


    return {
        medium:
            parseList(metadataParts[0]),

        format:
            parseList(metadataParts[1]),

        state:
            parseList(metadataParts[2]),

        topic:
            parseList(metadataParts[3]),

        description:
            humanDescription,

        metadataFound:
            true
    };
}


/* =========================================================
   FIND HERO IMAGE

   Current strategy:

   Look for an RSS <enclosure> whose MIME type is an image.

   We can expand this later if inspection of the actual
   Substack feed shows another reliable image location.
   ========================================================= */

function getPostImage(item) {

    const enclosure =
        item.querySelector("enclosure");


    if (enclosure) {

        const type =
            enclosure.getAttribute("type") ?? "";


        const url =
            enclosure.getAttribute("url") ?? "";


        if (type.startsWith("image/")) {
            return url;
        }
    }


    return "";
}


/* =========================================================
   LOAD POSTS

   Request the Substack RSS feed and convert every <item>
   into the standard post object used by the website.
   ========================================================= */

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


                    const metadata =
                        parsePostDescription(
                            descriptionHTML
                        );


                    const image =
                        getPostImage(item);


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
                            image,

                        medium:
                            metadata.medium,

                        format:
                            metadata.format,

                        state:
                            metadata.state,

                        topic:
                            metadata.topic,

                        description:
                            metadata.description,

                        metadataFound:
                            metadata.metadataFound
                    };


                    /* -------------------------------------
                       DEBUG INDIVIDUAL POST
                       ------------------------------------- */

                    if (DEBUG) {

                        console.groupCollapsed(
                            `POST ${index + 1}: ${post.title}`
                        );


                        console.log(
                            "Post object:",
                            post
                        );


                        console.log(
                            "Metadata detected:",
                            post.metadataFound
                                ? "YES"
                                : "NO"
                        );


                        console.log(
                            "Raw RSS description:",
                            descriptionHTML
                        );


                        console.log(
                            "Raw RSS item:",
                            item
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

            const structuredCount =
                posts.filter(
                    post => post.metadataFound
                ).length;


            console.log(
                `5. ${posts.length} posts normalized.`
            );


            console.log(
                `6. ${structuredCount} posts contain structured metadata.`
            );


            console.table(

                posts.map(post => ({

                    title:
                        post.title,

                    medium:
                        post.medium.join(", "),

                    format:
                        post.format.join(", "),

                    state:
                        post.state.join(", "),

                    topic:
                        post.topic.join(", "),

                    metadata:
                        post.metadataFound
                            ? "YES"
                            : "NO",

                    image:
                        post.image
                            ? "YES"
                            : "NO"
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
   BUILD ARCHIVE DATA

   Discover every metadata value that actually exists in
   the current collection.

   Nothing is hard-coded here.

   If a new format called "Instrumental" appears in a post,
   "Instrumental" automatically becomes available to the
   archive navigation.

   Result example:

   {
       medium: [
           { value: "Music", count: 4 },
           { value: "Writing", count: 7 }
       ],

       format: [
           { value: "Essay", count: 5 },
           { value: "Song", count: 4 }
       ]
   }
   ========================================================= */

function buildArchiveData(posts) {

    const archiveData = {};


    ARCHIVE_DIMENSIONS.forEach(dimension => {

        /*
         * Map normalized values to:
         *
         * {
         *     value: original display label,
         *     count: number of matching posts
         * }
         */

        const values = new Map();


        posts.forEach(post => {

            const postValues =
                post[dimension.key] ?? [];


            postValues.forEach(value => {

                const normalized =
                    normalizeValue(value);


                if (!normalized) {
                    return;
                }


                if (!values.has(normalized)) {

                    values.set(
                        normalized,
                        {
                            value: value,
                            count: 0
                        }
                    );
                }


                values.get(normalized).count += 1;
            });
        });


        /*
         * Alphabetical navigation is predictable and easy
         * to scan.
         */

        archiveData[dimension.key] =
            Array.from(values.values())
                .sort((a, b) =>
                    a.value.localeCompare(
                        b.value,
                        undefined,
                        {
                            sensitivity: "base"
                        }
                    )
                );
    });


    return archiveData;
}


/* =========================================================
   FILTER POSTS

   One active navigation choice at a time.

   Examples:

   medium → Music
   format → Essay
   state  → Voice Memo
   topic  → Family

   No active filter means return every post.
   ========================================================= */

function filterPosts(
    posts,
    dimension,
    value
) {

    if (!dimension || !value) {
        return [...posts];
    }


    /*
     * Only allow known archive dimensions.
     */

    const validDimension =
        ARCHIVE_DIMENSIONS.some(
            item => item.key === dimension
        );


    if (!validDimension) {

        console.warn(
            "Unknown archive dimension:",
            dimension
        );

        return [...posts];
    }


    const normalizedTarget =
        normalizeValue(value);


    return posts.filter(post => {

        const values =
            post[dimension] ?? [];


        return values.some(
            item =>
                normalizeValue(item) ===
                normalizedTarget
        );
    });
}


/* =========================================================
   SET ACTIVE FILTER

   This is the central doorway for navigation changes.

   Rather than letting buttons independently manipulate
   posts, every navigation action updates one state object
   and then refreshes the interface.
   ========================================================= */

function setActiveFilter(
    dimension = null,
    value = null
) {

    activeFilter = {
        dimension: dimension,
        value: value
    };


    const visiblePosts =
        filterPosts(
            allPosts,
            activeFilter.dimension,
            activeFilter.value
        );


    if (DEBUG) {

        console.log(
            "Filter changed:",
            activeFilter
        );


        console.log(
            `Displaying ${visiblePosts.length} / ${allPosts.length} posts`
        );
    }


    displayPosts(
        visiblePosts
    );


    /*
     * Rebuild navigation so its active state stays
     * synchronized with the posts being displayed.
     */

    buildNavigation(
        allPosts
    );
}


/* =========================================================
   CREATE FILTER BUTTON

   Small helper used by buildNavigation().

   Using real <button> elements gives us keyboard behavior
   and accessibility semantics without recreating them
   manually in JavaScript.
   ========================================================= */

function createFilterButton(
    label,
    dimension,
    value,
    count = null
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
        dimension === null

            ? activeFilter.dimension === null

            : (
                activeFilter.dimension === dimension &&
                normalizeValue(
                    activeFilter.value
                ) ===
                normalizeValue(value)
            );


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
     * Optional post count.
     */

    if (count !== null) {

        const countElement =
            document.createElement("span");


        countElement.className =
            "archive-filter-count";


        countElement.textContent =
            count;


        /*
         * The count is visual information accompanying the
         * label. Screen readers can already understand the
         * button without needing the number repeated.
         */

        countElement.setAttribute(
            "aria-hidden",
            "true"
        );


        button.appendChild(
            countElement
        );
    }


    button.addEventListener(
        "click",
        () => {

            setActiveFilter(
                dimension,
                value
            );
        }
    );


    return button;
}


/* =========================================================
   BUILD NAVIGATION

   The future HTML will provide:

       id="archive-navigation"

   Until that exists, this function simply exits.

   That means this new JS remains compatible with the
   current HTML while we build one file at a time.
   ========================================================= */

function buildNavigation(posts) {

    const navigation =
        document.getElementById(
            "archive-navigation"
        );


    /*
     * IMPORTANT:
     *
     * We have not updated HTML yet.
     *
     * Therefore a missing navigation container is expected
     * and should NOT prevent the archive from loading.
     */

    if (!navigation) {

        debugLog(
            "Archive navigation container not present yet. Posts will still display."
        );

        return;
    }


    navigation.innerHTML = "";


    const archiveData =
        buildArchiveData(posts);


    /* -----------------------------------------------------
       ALL POSTS
       ----------------------------------------------------- */

    const allPostsButton =
        createFilterButton(
            "All Posts",
            null,
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
       DIMENSIONS
       ----------------------------------------------------- */

    ARCHIVE_DIMENSIONS.forEach(
        dimension => {


            const values =
                archiveData[dimension.key];


            /*
             * Don't create an empty navigation section.
             */

            if (!values || values.length === 0) {
                return;
            }


            const section =
                document.createElement("section");


            section.className =
                "archive-filter-group";


            section.dataset.dimension =
                dimension.key;


            /* ---------------------------------------------
               SECTION HEADING
               --------------------------------------------- */

            const heading =
                document.createElement("h2");


            heading.className =
                "archive-filter-heading";


            heading.textContent =
                dimension.label;


            section.appendChild(
                heading
            );


            /* ---------------------------------------------
               FILTER LIST
               --------------------------------------------- */

            const list =
                document.createElement("div");


            list.className =
                "archive-filter-list";


            values.forEach(item => {

                const button =
                    createFilterButton(
                        item.value,
                        dimension.key,
                        item.value,
                        item.count
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
    );


    if (DEBUG) {

        console.groupCollapsed(
            "Archive navigation"
        );


        ARCHIVE_DIMENSIONS.forEach(
            dimension => {

                const values =
                    archiveData[
                    dimension.key
                    ];


                console.log(
                    `${dimension.label}:`,
                    values
                        .map(
                            item =>
                                `${item.value} (${item.count})`
                        )
                        .join(", ") ||
                    "none"
                );
            }
        );


        console.groupEnd();
    }
}


/* =========================================================
   DISPLAY POSTS

   Receives whatever collection should currently be visible.

   This function does NOT decide which posts belong in a
   category. It only renders the posts it is given.
   ========================================================= */

function displayPosts(posts) {

    const container =
        document.getElementById("posts");


    const status =
        document.getElementById("status");


    /*
     * Guard against incorrect HTML.
     *
     * Once we update the HTML, these elements will be part
     * of the contract between the two files.
     */

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
     * Sort newest → oldest without mutating the array.
     */

    const sortedPosts = [...posts]
        .sort((a, b) => {

            const dateA =
                new Date(a.date).getTime();


            const dateB =
                new Date(b.date).getTime();


            /*
             * Keep invalid dates stable instead of allowing
             * NaN to produce unpredictable sorting.
             */

            if (
                Number.isNaN(dateA) ||
                Number.isNaN(dateB)
            ) {
                return 0;
            }


            return dateB - dateA;
        });


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


            /*
             * Allow the browser to defer off-screen images.
             */

            image.loading =
                "lazy";


            /*
             * Helps the browser decode images without
             * unnecessarily blocking page interaction.
             */

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

   This is the application's startup sequence.

   1. Load RSS once.
   2. Store it as allPosts.
   3. Discover/build navigation.
   4. Display everything.

   Filtering after this point happens entirely in memory.
   We do NOT request the RSS feed again every time someone
   clicks a category.
   ========================================================= */

async function startPage() {

    const status =
        document.getElementById("status");


    try {

        const posts =
            await loadSubstackPosts();


        /*
         * Establish the single master collection.
         */

        allPosts =
            posts;


        /*
         * Discover categories from the actual archive.
         */

        const archiveData =
            buildArchiveData(
                allPosts
            );


        if (DEBUG) {

            console.log(
                "Archive data:",
                archiveData
            );
        }


        /*
         * This will become visible after our HTML pass.
         *
         * For now, a missing navigation element is safe.
         */

        buildNavigation(
            allPosts
        );


        /*
         * Default view = everything.
         */

        displayPosts(
            allPosts
        );


        if (DEBUG) {

            console.log(
                `Archive ready. Displaying ${allPosts.length} / ${allPosts.length} posts.`
            );
        }


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
