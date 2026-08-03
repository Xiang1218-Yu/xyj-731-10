const cloudHelper = require('../../../helper/cloud_helper.js');

async function config1({
	cover,
	title,
	desc,
	qr,
    bg = '',
    user = '',
    avatar = '' //头像
}) {
	// 安全处理：cover/qr/avatar 可能为 undefined、空字符串或非 cloud:// 链接，
	// 直接 startsWith 会抛异常，进而导致页面 onLoad 失败、云环境报错。
	if (cover && typeof cover === 'string' && cover.startsWith('cloud'))
		cover = await cloudHelper.getTempFileURLOne(cover);
	else
		cover = cover || '';

	if (qr && typeof qr === 'string' && qr.startsWith('cloud'))
		qr = await cloudHelper.getTempFileURLOne(qr);
	else
		qr = qr || '';

    if (avatar && typeof avatar === 'string' && avatar.startsWith('cloud'))
        avatar = await cloudHelper.getTempFileURLOne(avatar);
	else
		avatar = avatar || '';

	let posterConfig = {
		width: 480, // rpx
		height: 650,
		backgroundColor: '#eeeeee'
	};
	if (bg) posterConfig.backgroundColor = bg;


	let blocks = [];
	blocks = [{
		x: 30,
		y: 30,
		backgroundColor: '#ffffff',
		width: 420,
		height: 590,
		borderRadius: 20
	}];

	let texts = [];
	texts = [{
		x: 50,
		y: 350,
		text: title,
		width: 360,
		lineNum: 2,
		lineHeight: 40,
		fontSize: 26,
		color: '#000000',
		textAlign: 'left',
		zIndex: 9999
	},
	{
		x: 55,
		y: 510,
		text: '长按识别小程序码',
		fontSize: 18,
		color: '#aaaaaa',
		zIndex: 9999
	}, {
		x: 55,
		y: 540,
		text: desc,
		fontSize: 18,
		color: '#aaaaaa',
		zIndex: 9999
	}];

    if (user) {
        texts.push({
            x: 55,
            y: 480,
            text: user,
            fontSize: 18,
            color: bg,
            zIndex: 9999
        });
    }

	let images = [];
	if (cover) {
		images.push({ // 底图
			x: 40,
			y: 40,
			url: cover,
			width: 400,
			height: 260,
			zIndex: 999
		});
	}

	if (qr) {
		images.push({ // 小程序码
			x: 310,
			y: 460,
			url: qr,
			width: 120,
			height: 120
		});
	}

    if (avatar) {
        images.push({ // 头像
            x: 343,
            y: 493,
            url: avatar,
            width: 54,
            height: 54,
            borderRadius: 54
        });
    }

	posterConfig.texts = texts;
	posterConfig.blocks = blocks
	posterConfig.images = images;

	return posterConfig;
}


module.exports = {
	config1
}