const express = require("express");
const cheerio = require("cheerio");
const request = require("request");

const router = express.Router();

const baseUrl = "https://boxnovel.com/novel";

const searchUrl = "https://boxnovel.com/";

// Top novels

function apiCall(reqOps) {
    return new Promise(function (resolve, reject) {
        request(reqOps, (err, res, body) => {
            if (!err && res.statusCode == 200) {
                if (err) throw err;

                let novels = [];

                $ = cheerio.load(body);

                $(".page-item-detail").each(function (result) {
                    novelName = $(this).find("h5 > a").text();
                    novelCover = $(this).find("img").attr("src");
                    novelUrl = $(this)
                        .find("h5 > a")
                        .attr("href")
                        .replace(`${baseUrl}/`, "");
                    novel = {
                        extensionId: 1,
                        novelName: novelName,
                        novelCover: novelCover,
                        novelUrl: novelUrl,
                    };

                    novels.push(novel);
                });
                resolve(novels);
            }

            reject(err);
        });
    });
}

router.get("/novels/:pageNo/", (req, res) => {
    orderBy = req.query.o;
    pageNo = req.params.pageNo;

    let url = `${baseUrl}/page/1/?m_orderby=${orderBy}`;

    let page1, page2, page3, page4;

    apiCall(url)
        .then((res) => {
            page1 = res;
            return apiCall(`${baseUrl}/page/2/?m_orderby=${orderBy}`);
        })
        .then((res) => {
            page2 = res;
            return apiCall(`${baseUrl}/page/3/?m_orderby=${orderBy}`);
        })
        .then((res) => {
            page3 = res;
            return apiCall(`${baseUrl}/page/4/?m_orderby=${orderBy}`);
        })
        .then((result) => {
            page4 = result;

            res.json([...page1, ...page2, ...page3, ...page4]);
        })
        .catch((err) => {
            console.log("Error occured in one of the API call: ", err);
        });
});

// Novel

router.get("/novel/:novelUrl", (req, res) => {
    novelUrl = req.params.novelUrl;
    url = `${baseUrl}/${novelUrl}/`;

    request(url, (err, response, body) => {
        if (err) throw err;

        $ = cheerio.load(body);

        let novel = {};

        $(".post-title > h3 > span").remove();

        novel.extensionId = 1;

        novel.sourceName = "BoxNovel";

        novel.sourceUrl = url;

        novel.novelUrl = `${novelUrl}/`;

        novel.novelName = $(".post-title > h3")
            .text()
            .replace(/[\t\n]/g, "")
            .trim();

        novel.novelCover = $(".summary_image > a > img").attr("src");

        $(".post-content_item").each(function (result) {
            detailName = $(this)
                .find(".summary-heading > h5")
                .text()
                .replace(/[\t\n]/g, "")
                .trim();
            detail = $(this)
                .find(".summary-content")
                .text()
                .replace(/[\t\n]/g, "")
                .trim();

            novel[detailName] = detail;
        });

        $(".description-summary > div.summary__content").find("em").remove();

        novel.novelSummary = $(
            ".description-summary > div.summary__content > div"
        )
            .text()
            .replace(/[\t\n]/g, "");

        // if (novel.novelSummary === "") {
        //     novel.novelSummary = $(".c_000").text();
        // }

        let novelChapters = [];

        $(".wp-manga-chapter").each(function (result) {
            chapterName = $(this)
                .find("a")
                .text()
                .replace(/[\t\n]/g, "")
                .trim();

            releaseDate = $(this)
                .find("span")
                .text()
                .replace(/[\t\n]/g, "")
                .trim();

            chapterUrl = $(this).find("a").attr("href").replace(url, "");

            novelChapters.push({ chapterName, releaseDate, chapterUrl });
        });

        novel.novelChapters = novelChapters.reverse();

        res.json(novel);
    });
});

// Chapter

router.get("/novel/:novelUrl/:chapterUrl", (req, res) => {
    url = `${baseUrl}/${req.params.novelUrl}/${req.params.chapterUrl}`;

    request(url, (err, response, body) => {
        if (err) throw err;

        $ = cheerio.load(body);

        chapterNameLower = req.params.chapterUrl.replace("-", " ");

        chapterName =
            chapterNameLower.charAt(0).toUpperCase() +
            chapterNameLower.slice(1);

        chapterText = $(".reading-content").text();

        let nextChapter = null;

        if ($(".nav-next").length) {
            nextChapter = $(".nav-next")
                .find("a")
                .attr("href")
                .replace(baseUrl + "/" + req.params.novelUrl + "/", "");
        }

        let prevChapter = null;

        if ($(".nav-previous").length) {
            prevChapter = $(".nav-previous")
                .find("a")
                .attr("href")
                .replace(baseUrl + "/" + req.params.novelUrl + "/", "");
        }

        chapter = {
            extensionId: 1,
            novelUrl: `${req.params.novelUrl}/`,
            chapterUrl: `${req.params.chapterUrl}/`,
            chapterName,
            chapterText,
            nextChapter,
            prevChapter,
        };

        res.json(chapter);
    });
});

// Search

router.get("/search/", (req, res) => {
    searchTerm = req.query.s;
    orderBy = req.query.o;

    url = `${searchUrl}?s=${searchTerm}&post_type=wp-manga&m_orderby=${orderBy}`;

    request(url, (err, response, body) => {
        if (err) throw err;

        $ = cheerio.load(body);

        let novels = [];

        $(".c-tabs-item__content").each(function (result) {
            novelName = $(this).find("h4 > a").text();
            novelCover = $(this).find("img").attr("src");

            novelUrl = $(this)
                .find("h4 > a")
                .attr("href")
                .replace(`${baseUrl}/`, "");

            novels.push({
                extensionId: 1,
                novelName,
                novelCover,
                novelUrl,
            });
        });

        res.json(novels);
    });
});

module.exports = router;
