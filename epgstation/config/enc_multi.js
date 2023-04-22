const spawn = require('child_process').spawn;
const execFile = require('child_process').execFile;
const ffmpeg = process.env.FFMPEG;
const ffprobe = process.env.FFPROBE;
const input = process.env.INPUT;
const output = process.env.OUTPUT;
const name = process.env.NAME;

const isDualMono = parseInt(process.env.AUDIOCOMPONENTTYPE, 10) == 2;
const isCodec265 = process.argv[2] && process.argv[2] == '265'
const isHardwareEncode = process.argv[3] && process.argv[3] == 'hardware'

/**
 * 動画長取得関数
 * @param {string} filePath ファイルパス
 * @return number 動画長を返す (秒)
 */
const getDuration = filePath => {
    return new Promise((resolve, reject) => {
        execFile(ffprobe, ['-v', '0', '-show_format', '-of', 'json', filePath], (err, stdout) => {
            if (err) {
                reject(err);

                return;
            }

            try {
                const result = JSON.parse(stdout);
                resolve(parseFloat(result.format.duration));
            } catch (err) {
                reject(err);
            }
        });
    });
};

const args = [];
Array.prototype.push.apply(args, [
    '-y',
    '-fix_sub_duration',
    '-analyzeduration', "10M",
    '-probesize', '32M',
]);

if (isHardwareEncode) {
    Array.prototype.push.apply(args, [
        '-vaapi_device', '/dev/dri/renderD128',
        '-hwaccel', 'vaapi',
        '-hwaccel_output_format', 'vaapi',
    ]);
}

Array.prototype.push.apply(args, [
    '-i', input,
    '-movflags', '+faststart',
    '-ignore_unknown',
]);

// 音声
if (isDualMono) {
    Array.prototype.push.apply(args, [
        '-filter_complex',
        'channelsplit',
        '-metadata:s:a:0', 'title=main',
        '-metadata:s:a:1', 'title=sub'
    ]);
}

Array.prototype.push.apply(args, ['-map', '0:a', '-c:a', 'aac', '-ac', '2']);

// 映像
Array.prototype.push.apply(args, ['-map', '0:v']);

if (isHardwareEncode) {
    if (isCodec265) {
        Array.prototype.push.apply(args, [
            '-vf', 'format=vaapi,deinterlace_vaapi',
            '-c:v', 'hevc_vaapi',
            '-qp', '27',
            '-tag:v', 'hvc1',
        ]);
    } else {
        Array.prototype.push.apply(args, [
            '-vf', 'format=vaapi,deinterlace_vaapi',
            '-c:v', 'h264_vaapi',
            '-level', '40',
            '-qp', '27',
        ]);
    }
} else {
    if (isCodec265) {
        Array.prototype.push.apply(args, [
            '-vf', 'yadif',
            '-preset', 'veryfast',
            '-c:v', 'libx265',
            '-crf', '22',
            '-f', 'mp4',
            '-tag:v', 'hvc1',
        ]);
    } else {
        Array.prototype.push.apply(args, [
            '-vf', 'yadif',
            '-preset', 'veryfast',
            '-c:v', 'libx264',
            '-crf', '22',
            '-f', 'mp4',
        ]);
    }
}

// その他
Array.prototype.push.apply(args, [
    '-map', '0:s?',
    '-c:s', 'mov_text',
    '-max_muxing_queue_size', '1024',
    output
]);

(async () => {
    // 進捗計算のために動画の長さを取得
    const duration = await getDuration(input);

    const child = spawn(ffmpeg, args);

    /**
     * エンコード進捗表示用に標準出力に進捗情報を吐き出す
     * 出力する JSON
     * {"type":"progress","percent": 0.8, "log": "view log" }
     */
    child.stderr.on('data', data => {
        let strbyline = String(data).split('\n');
        for (let i = 0; i < strbyline.length; i++) {
            let str = strbyline[i];
            if (str.startsWith('frame')) {
                // 想定log
                // frame= 5159 fps= 11 q=29.0 size=  122624kB time=00:02:51.84 bitrate=5845.8kbits/s dup=19 drop=0 speed=0.372x
                const progress = {};
                const ffmpeg_reg = /frame=\s*(?<frame>\d+)\sfps=\s*(?<fps>\d+(?:\.\d+)?)\sq=\s*(?<q>[+-]?\d+(?:\.\d+)?)\sL?size=\s*(?<size>\d+(?:\.\d+)?)kB\stime=\s*(?<time>\d+[:\.\d+]*)\sbitrate=\s*(?<bitrate>\d+(?:\.\d+)?)kbits\/s(?:\sdup=\s*(?<dup>\d+))?(?:\sdrop=\s*(?<drop>\d+))?\sspeed=\s*(?<speed>\d+(?:\.\d+)?)x/;
                let ffmatch = str.match(ffmpeg_reg);
                /**
                 * match結果
                 * [
                 *   'frame= 5159 fps= 11 q=29.0 size=  122624kB time=00:02:51.84 bitrate=5845.8kbits/s dup=19 drop=0 speed=0.372x',
                 *   '5159',
                 *   '11',
                 *   '29.0',
                 *   '122624',
                 *   '00:02:51.84',
                 *   '5845.8',
                 *   '19',
                 *   '0',
                 *   '0.372',
                 *   index: 0,
                 *   input: 'frame= 5159 fps= 11 q=29.0 size=  122624kB time=00:02:51.84 bitrate=5845.8kbits/s dup=19 drop=0 speed=0.372x    \r',
                 *   groups: [Object: null prototype] {
                 *     frame: '5159',
                 *     fps: '11',
                 *     q: '29.0',
                 *     size: '122624',
                 *     time: '00:02:51.84',
                 *     bitrate: '5845.8',
                 *     dup: '19',
                 *     drop: '0',
                 *     speed: '0.372'
                 *   }
                 * ]
                 */

                if (ffmatch === null) continue;

                progress['frame'] = parseInt(ffmatch.groups.frame);
                progress['fps'] = parseFloat(ffmatch.groups.fps);
                progress['q'] = parseFloat(ffmatch.groups.q);
                progress['size'] = parseInt(ffmatch.groups.size);
                progress['time'] = ffmatch.groups.time;
                progress['bitrate'] = parseFloat(ffmatch.groups.bitrate);
                progress['dup'] = ffmatch.groups.dup == null ? 0 : parseInt(ffmatch.groups.dup);
                progress['drop'] = ffmatch.groups.drop == null ? 0 : parseInt(ffmatch.groups.drop);
                progress['speed'] = parseFloat(ffmatch.groups.speed);

                let current = 0;
                const times = progress.time.split(':');
                for (let i = 0; i < times.length; i++) {
                    if (i == 0) {
                        current += parseFloat(times[i]) * 3600;
                    } else if (i == 1) {
                        current += parseFloat(times[i]) * 60;
                    } else if (i == 2) {
                        current += parseFloat(times[i]);
                    }
                }

                // 進捗率 1.0 で 100%
                const percent = current / duration;
                const log =
                    'frame= ' +
                    progress.frame +
                    ' fps=' +
                    progress.fps +
                    ' size=' +
                    progress.size +
                    ' time=' +
                    progress.time +
                    ' bitrate=' +
                    progress.bitrate +
                    ' drop=' +
                    progress.drop +
                    ' speed=' +
                    progress.speed;

                console.log(JSON.stringify({ type: 'progress', percent: percent, log: log }));
            }
        }
    });

    child.on('error', err => {
        console.error(err);
        throw new Error(err);
    });

    process.on('SIGINT', () => {
        child.kill('SIGINT');
    });
})();
