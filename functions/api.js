export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const videoUrl = url.searchParams.get('url');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (!videoUrl) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Video URL is required'
    }), { headers });
  }

  try {
    let result = { success: false, message: 'Cannot fetch video' };

    // Platform detection
    if (videoUrl.includes('tiktok.com')) {
      // TikTok API
      const tiktokApi = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(videoUrl));
      const tiktokData = await tiktokApi.json();

      if (tiktokData.code === 0 && tiktokData.data) {
        result = {
          success: true,
          videoUrl: tiktokData.data.play || tiktokData.data.hdplay || tiktokData.data.wmplay,
          thumbnail: tiktokData.data.cover || tiktokData.data.origin_cover || '',
          title: tiktokData.data.title || 'TikTok Video',
          uploader: tiktokData.data.author?.nickname || '',
          duration: tiktokData.data.duration ? tiktokData.data.duration + 's' : '',
          fileName: 'tiktok_' + Date.now() + '.mp4'
        };
      }
    } else {
      // Other platforms
      const apiUrl = 'https://social-dl.lmnx9.workers.dev/?url=' + encodeURIComponent(videoUrl) + '&format=video&quality=best';
      const apiResponse = await fetch(apiUrl);
      const apiData = await apiResponse.json();

      if (apiData.success && apiData.result) {
        const r = apiData.result;
        let formats = r.formats ? r.formats.filter(f => f.url && f.resolution !== 'audio only') : [];
        if (!formats.length && r.direct_url) formats = [{ url: r.direct_url }];

        if (formats.length > 0) {
          const format = formats[0];
          let duration = '';
          if (r.duration_seconds) {
            const m = Math.floor(r.duration_seconds / 60);
            const s = Math.floor(r.duration_seconds % 60);
            duration = m + ':' + String(s).padStart(2, '0');
          }

          result = {
            success: true,
            videoUrl: format.url,
            thumbnail: r.thumbnail || '',
            title: r.title || r.description || 'Video',
            uploader: r.uploader || '',
            duration: duration,
            fileName: 'video_' + Date.now() + '.' + (format.ext || 'mp4')
          };
        }
      }
    }

    return new Response(JSON.stringify(result), { headers });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Service temporarily unavailable'
    }), { headers });
  }
}
