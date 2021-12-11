const request = require('request-promise');

toTime = sec => {
    sec=+sec;
    let h = sec/3600|0;
    let m = sec/60%60|0;
    let s = sec%60;
    h=h>0?h+':':'';
    m=m<10&&h!=0?'0'+m:m;
    s=s<10?'0'+s:s;
    return h+m+':'+s;
}

toSec = time => {
    let res = 0;
    time = time.split(':').reverse();
    for(let i=0;i<time.length;i++) res+=+time[i]*(i==0?1:i==1?60:60*60);
    return res;
}

module.exports = {
    search : async (keyword,num=5) => {
        let res = []
        let data = await request(`https://www.youtube.com/results?search_query=${encodeURI(keyword)}&sp=CAASAhAB`);
        data = data.split('var ytInitialData = ')[1].split(';')[0];
        data = JSON.parse(data).contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        for(let i=0;i<(data.length<5?data.length:num);i++) res.push({
            'title':data[i].videoRenderer.title.runs[0].text,
            'owner':data[i].videoRenderer.shortBylineText.runs[0].text,
            'length':!data[i].videoRenderer.lengthText?"LIVE":data[i].videoRenderer.lengthText.simpleText,
            // 'url':'https://www.youtube.com/watch?v='+data[i].videoRenderer.videoId,
            'url':'https://youtu.be/'+data[i].videoRenderer.videoId,
            'image':data[i].videoRenderer.thumbnail.thumbnails[0].url
        });
        return res;
    },
    url : async id => {
        if(id.indexOf('playlist?')!=-1 || id.indexOf('&list')!=-1) {
            let res = [];
            id = id.indexOf('playlist?')!=-1?id.split('?list=')[1]:id.split('&list=')[1].split('&index')[0];
            let data = await request(`https://www.youtube.com/playlist?list=${id}`);
            data = data.split('var ytInitialData = ')[1].split(';')[0];
            data = JSON.parse(data).contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
            for(let i=0;i<data.length;i++) res.push({
                'title':data[i].playlistVideoRenderer.title.runs[0].text,
                'owner':data[i].playlistVideoRenderer.shortBylineText.runs[0].text,
                'length':data[i].playlistVideoRenderer.lengthText.simpleText,
                // 'url':'https://www.youtube.com/watch?v='+data[i].playlistVideoRenderer.videoId,
                'url':'https://youtu.be/'+data[i].playlistVideoRenderer.videoId,
                'image':data[i].playlistVideoRenderer.thumbnail.thumbnails[0].url
            });
            return res;
        } else {
            id = id.indexOf('youtu.be')!=-1?id.split('/')[3]:id.split('?v=')[1];
            let data = await request(`https://www.youtube.com/watch?v=${id}`);
            data = data.split('var ytInitialPlayerResponse = ')[1].split('};')[0]+'}';
            data = JSON.parse(data).videoDetails;
            return [{
                'title':data.title,
                'owner':data.author,
                'length':toTime(data.lengthSeconds),
                'url':'https://youtu.be/'+data.videoId,
                'image':data.thumbnail.thumbnails[0].url
            }];
        }
    }
}