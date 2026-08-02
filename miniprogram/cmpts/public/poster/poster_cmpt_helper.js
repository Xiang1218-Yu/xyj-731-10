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
	if (cover.startsWith('cloud'))
		cover = await cloudHelper.getTempFileURLOne(cover);

	if (qr.startsWith('cloud'))
		qr = await cloudHelper.getTempFileURLOne(qr);

    if (avatar.startsWith('cloud'))
        avatar = await cloudHelper.getTempFileURLOne(avatar);

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

/**
 * 海报模板2：深色大图卡片，标题居中、底部信息栏
 */
async function config2({
	cover,
	title,
	desc,
	qr,
	bg = '#2b2b3a',
	user = '',
	avatar = ''
}) {
	if (cover.startsWith('cloud'))
		cover = await cloudHelper.getTempFileURLOne(cover);
	if (qr.startsWith('cloud'))
		qr = await cloudHelper.getTempFileURLOne(qr);
	if (avatar.startsWith('cloud'))
		avatar = await cloudHelper.getTempFileURLOne(avatar);

	let posterConfig = {
		width: 480,
		height: 680,
		backgroundColor: bg || '#2b2b3a'
	};

	// 大图占满上半部分
	let images = [];
	if (cover) {
		images.push({
			x: 0,
			y: 0,
			url: cover,
			width: 480,
			height: 380,
			zIndex: 1
		});
	}
	if (qr) {
		images.push({
			x: 40,
			y: 540,
			url: qr,
			width: 110,
			height: 110
		});
	}

	// 标题居中
	let texts = [{
		x: 240,
		y: 420,
		text: title,
		width: 400,
		lineNum: 2,
		lineHeight: 44,
		fontSize: 30,
		color: '#ffffff',
		textAlign: 'center',
		zIndex: 9999
	}, {
		x: 170,
		y: 560,
		text: user ? ('来自 ' + user + ' 的分享') : '长按识别小程序码',
		fontSize: 20,
		color: '#dddddd',
		zIndex: 9999
	}, {
		x: 170,
		y: 600,
		text: desc,
		fontSize: 18,
		color: '#aaaaaa',
		zIndex: 9999
	}];

	posterConfig.texts = texts;
	posterConfig.blocks = [];
	posterConfig.images = images;

	return posterConfig;
}

/**
 * 海报模板3：清新简约，白底、上文字下大图、圆角
 */
async function config3({
	cover,
	title,
	desc,
	qr,
	bg = '#ffffff',
	user = '',
	avatar = ''
}) {
	if (cover.startsWith('cloud'))
		cover = await cloudHelper.getTempFileURLOne(cover);
	if (qr.startsWith('cloud'))
		qr = await cloudHelper.getTempFileURLOne(qr);
	if (avatar.startsWith('cloud'))
		avatar = await cloudHelper.getTempFileURLOne(avatar);

	let posterConfig = {
		width: 480,
		height: 700,
		backgroundColor: bg || '#ffffff'
	};

	let blocks = [{
		x: 30,
		y: 30,
		backgroundColor: '#ffffff',
		width: 420,
		height: 640,
		borderRadius: 24
	}];

	let texts = [{
		x: 55,
		y: 70,
		text: title,
		width: 370,
		lineNum: 2,
		lineHeight: 44,
		fontSize: 30,
		color: '#222222',
		textAlign: 'left',
		zIndex: 9999
	}, {
		x: 55,
		y: 590,
		text: '长按识别小程序码查看详情',
		fontSize: 18,
		color: '#999999',
		zIndex: 9999
	}, {
		x: 55,
		y: 620,
		text: desc,
		fontSize: 18,
		color: '#999999',
		zIndex: 9999
	}];

	if (user) {
		texts.push({
			x: 55,
			y: 560,
			text: '来自 ' + user,
			fontSize: 18,
			color: '#666666',
			zIndex: 9999
		});
	}

	let images = [];
	if (cover) {
		images.push({
			x: 55,
			y: 170,
			url: cover,
			width: 370,
			height: 360,
			borderRadius: 16,
			zIndex: 999
		});
	}
	if (qr) {
		images.push({
			x: 320,
			y: 560,
			url: qr,
			width: 110,
			height: 110
		});
	}

	posterConfig.texts = texts;
	posterConfig.blocks = blocks;
	posterConfig.images = images;

	return posterConfig;
}

/**
 * 按模板编号统一生成海报配置
 * @param {number|string} template 模板编号 1/2/3
 * @param {object} params 海报数据
 */
async function configByTemplate(template, params) {
	switch (String(template)) {
		case '2': return await config2(params);
		case '3': return await config3(params);
		default: return await config1(params);
	}
}

// 可选模板列表 (供选择UI渲染)
const TEMPLATES = [
	{ id: 1, name: '经典白' },
	{ id: 2, name: '深色大图' },
	{ id: 3, name: '清新简约' },
];


module.exports = {
	config1,
	config2,
	config3,
	configByTemplate,
	TEMPLATES
}