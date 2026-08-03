const cloudHelper = require('../../../helper/cloud_helper.js');

// 活动海报模板配色
const ACTIVITY_TEMPLATES = {
	// 简约蓝
	template1: {
		bgColor: '#3B7DD8',
		cardBg: '#ffffff',
		titleColor: '#1a1a1a',
		labelColor: '#3B7DD8',
		textColor: '#666666',
		hintColor: '#999999',
	},
	// 温馨橙
	template2: {
		bgColor: '#FF8C42',
		cardBg: '#ffffff',
		titleColor: '#1a1a1a',
		labelColor: '#FF8C42',
		textColor: '#666666',
		hintColor: '#999999',
	},
	// 文艺绿
	template3: {
		bgColor: '#5BAE6A',
		cardBg: '#ffffff',
		titleColor: '#1a1a1a',
		labelColor: '#5BAE6A',
		textColor: '#666666',
		hintColor: '#999999',
	},
};

// 海报标准尺寸
const POSTER_WIDTH = 750;
const POSTER_HEIGHT = 1334;

/**
 * 将日期字符串格式化为 M月D日 h:m
 * @param {string} dateStr 例如 2024-01-15 14:30:00
 */
function formatActivityTime(dateStr) {
	if (!dateStr) return '';
	// 如果已经包含"月"和"日"，说明已格式化，直接返回
	if (dateStr.includes('月') && dateStr.includes('日')) return dateStr;

	let arr = dateStr.split(' ');
	if (arr.length < 2) return dateStr;

	let dateParts = arr[0].split('-');
	let timeParts = arr[1].split(':');
	if (dateParts.length < 3 || timeParts.length < 2) return dateStr;

	let month = parseInt(dateParts[1]);
	let day = parseInt(dateParts[2]);
	let hour = parseInt(timeParts[0]);
	let minute = timeParts[1];

	return month + '月' + day + '日 ' + hour + ':' + minute;
}

/**
 * 生成活动海报配置（支持3种模板）
 * @param {object} activity 活动数据
 * @param {string} template 模板名称 template1/template2/template3
 * @returns {object} wxa-plugin-canvas 海报配置
 */
async function generateActivityPosterConfig(activity, template = 'template1') {
	if (!activity) return null;

	let colors = ACTIVITY_TEMPLATES[template] || ACTIVITY_TEMPLATES.template1;

	// 获取封面图和小程序码（云存储ID转临时URL，失败时降级处理）
	let cover = '';
	if (activity.ACTIVITY_OBJ && activity.ACTIVITY_OBJ.cover && activity.ACTIVITY_OBJ.cover.length > 0) {
		cover = activity.ACTIVITY_OBJ.cover[0];
		if (cover && cover.startsWith('cloud')) {
			try {
				cover = await cloudHelper.getTempFileURLOne(cover);
			} catch (e) {
				console.warn('封面URL获取失败', e);
				cover = '';
			}
		}
	}

	let qr = activity.ACTIVITY_QR || '';
	if (qr && qr.startsWith('cloud')) {
		try {
			qr = await cloudHelper.getTempFileURLOne(qr);
		} catch (e) {
			console.warn('二维码URL获取失败', e);
			qr = '';
		}
	}

	let title = activity.ACTIVITY_TITLE || '';
	let address = activity.ACTIVITY_ADDRESS || '';
	let timeStr = formatActivityTime(activity.start || activity.time || '');

	// 海报配置
	let posterConfig = {
		width: POSTER_WIDTH,
		height: POSTER_HEIGHT,
		pixelRatio: 2,
		backgroundColor: colors.bgColor,
		debug: false,
	};

	// 背景和卡片
	let blocks = [
		{
			// 白色内容卡片
			x: 40,
			y: 40,
			width: 670,
			height: 1254,
			backgroundColor: colors.cardBg,
			borderRadius: 24,
		},
	];

	// 文字元素
	let texts = [
		{
			// 活动标题
			x: 60,
			y: 520,
			text: title,
			width: 630,
			lineNum: 2,
			lineHeight: 50,
			fontSize: 38,
			color: colors.titleColor,
			textAlign: 'left',
			bold: true,
			zIndex: 9999,
		},
		{
			// "时间"标签
			x: 60,
			y: 640,
			text: '时间',
			fontSize: 24,
			color: colors.labelColor,
			zIndex: 9999,
		},
		{
			// 时间内容
			x: 140,
			y: 640,
			text: timeStr,
			width: 550,
			lineNum: 1,
			fontSize: 26,
			color: colors.textColor,
			zIndex: 9999,
		},
		{
			// "地点"标签
			x: 60,
			y: 700,
			text: '地点',
			fontSize: 24,
			color: colors.labelColor,
			zIndex: 9999,
		},
		{
			// 地点内容
			x: 140,
			y: 700,
			text: address,
			width: 550,
			lineNum: 2,
			lineHeight: 36,
			fontSize: 26,
			color: colors.textColor,
			zIndex: 9999,
		},
		{
			// 扫码提示
			x: 60,
			y: 1180,
			text: '长按识别小程序码',
			fontSize: 24,
			color: colors.hintColor,
			zIndex: 9999,
		},
		{
			// 副标题
			x: 60,
			y: 1220,
			text: '邀请你参加精彩活动',
			fontSize: 22,
			color: colors.hintColor,
			zIndex: 9999,
		},
	];

	// 图片元素
	let images = [];

	if (cover) {
		images.push({
			// 封面图
			x: 60,
			y: 60,
			url: cover,
			width: 630,
			height: 420,
			borderRadius: 12,
			zIndex: 999,
		});
	}

	if (qr) {
		images.push({
			// 小程序码
			x: 530,
			y: 1080,
			url: qr,
			width: 140,
			height: 140,
			zIndex: 999,
		});
	}

	// 装饰色块（底部条）
	blocks.push({
		x: 60,
		y: 490,
		width: 80,
		height: 8,
		backgroundColor: colors.bgColor,
		borderRadius: 4,
	});

	posterConfig.blocks = blocks;
	posterConfig.texts = texts;
	posterConfig.images = images;

	return posterConfig;
}

async function config1({
	cover,
	title,
	desc,
	qr,
    bg = '',
    user = '',
    avatar = '' //头像
}) {
	if (cover && cover.startsWith('cloud')) {
		try { cover = await cloudHelper.getTempFileURLOne(cover); } catch (e) { console.warn('封面URL获取失败', e); cover = ''; }
	}

	if (qr && qr.startsWith('cloud')) {
		try { qr = await cloudHelper.getTempFileURLOne(qr); } catch (e) { console.warn('二维码URL获取失败', e); qr = ''; }
	}

    if (avatar && avatar.startsWith('cloud')) {
        try { avatar = await cloudHelper.getTempFileURLOne(avatar); } catch (e) { console.warn('头像URL获取失败', e); avatar = ''; }
    }

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
	config1,
	generateActivityPosterConfig,
}