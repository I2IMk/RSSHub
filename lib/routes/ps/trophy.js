const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const id = ctx.params.id;

    const response = await got({
        method: 'get',
        url: `https://psnprofiles.com/${id}?order=last-trophy`,
    });

    const $ = cheerio.load(response.data);
    const list = $('.zebra tr')
        .filter(function() {
            return (
                $(this)
                    .find('.progress-bar span')
                    .text() !== '0%'
            );
        })
        .map((i, e) =>
            $(e)
                .find('.title')
                .attr('href')
        )
        .get()
        .slice(0, 3);

    const items = await Promise.all(
        list.map(async (item) => {
            const link = 'https://psnprofiles.com' + item + '?order=date&trophies=earned&lang=zh-cn';

            const response = await got({
                method: 'get',
                url: link,
            });

            const $ = cheerio.load(response.data);

            const list = $('.zebra tr.completed');
            const items = list
                .map((i, item) => {
                    item = $(item);
                    return {
                        title:
                            item.find('.title').text() +
                            ' - ' +
                            $('.page h3')
                                .eq(0)
                                .text()
                                .trim(),
                        description: `<img src="${item.find('.trophy img').attr('src')}"><br>${item
                            .find('.title')
                            .parent()
                            .contents()
                            .filter(function() {
                                return this.nodeType === 3;
                            })
                            .text()
                            .trim()}<br>珍贵度：${item.find('.hover-show .typo-top').text()}`,
                        link: 'https://psnprofiles.com' + item.find('.title').attr('href'),
                        pubDate: new Date(
                            +new Date(
                                item
                                    .find('.typo-top-date nobr')
                                    .contents()
                                    .filter(function() {
                                        return this.nodeType === 3;
                                    })
                                    .text() +
                                    ' ' +
                                    item.find('.typo-bottom-date').text()
                            ) +
                                8 * 60 * 60 * 1000
                        ).toUTCString(),
                    };
                })
                .get();

            return Promise.resolve(items);
        })
    );
    let result = [];
    items.forEach((item) => {
        result = result.concat(item);
    });

    ctx.state.data = {
        title: `${id} 的 PSN 奖杯`,
        link: `https://psnprofiles.com/${id}/log`,
        item: result,
    };
};