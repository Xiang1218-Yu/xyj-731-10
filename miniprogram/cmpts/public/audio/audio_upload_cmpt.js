/**
 * Notes: 语音录制上传组件 (多媒体打卡)
 * 录制后通过 upload 事件把本地临时文件路径抛给父组件, 由 transTempPics 统一上传云存储
 */
const pageHelper = require('../../../helper/page_helper.js');

// 全局录音管理器 (小程序单例)
const recorderManager = wx.getRecorderManager();
// 内部音频上下文 (播放试听)
let innerAudioContext = null;

Component({
	/**
	 * 组件的属性列表
	 */
	properties: {
		audioSrc: { // 已录制/上传的音频地址(本地临时路径或云fileID的临时URL)
			type: String,
			value: '',
		},
		title: {
			type: String,
			value: '语音',
		},
		must: { // 是否必填
			type: Boolean,
			value: false,
		},
		maxSecond: { // 最长录制秒数
			type: Number,
			value: 60,
		}
	},

	/**
	 * 组件的初始数据
	 */
	data: {
		isRecording: false, // 是否正在录音
		isPlaying: false,    // 是否正在播放
		duration: 0,         // 已录制时长(秒)
	},

	/**
	 * 生命周期方法
	 */
	lifetimes: {
		attached: function () {
			this._initRecorder();
		},
		detached: function () {
			// 释放音频资源
			if (innerAudioContext) {
				innerAudioContext.destroy();
				innerAudioContext = null;
			}
		},
	},

	/**
	 * 组件的方法列表
	 */
	methods: {
		// 初始化录音管理器回调
		_initRecorder: function () {
			recorderManager.onStop((res) => {
				this.setData({
					isRecording: false,
					audioSrc: res.tempFilePath,
				});
				// 抛出本地临时文件路径给父组件
				this.triggerEvent('upload', res.tempFilePath);
			});

			recorderManager.onError(() => {
				this.setData({ isRecording: false });
				pageHelper.showNoneToast('录音失败，请检查录音权限');
			});
		},

		// 开始/停止录音
		bindRecordTap: function () {
			if (this.data.isRecording) {
				recorderManager.stop();
				return;
			}

			recorderManager.start({
				duration: this.data.maxSecond * 1000, // 最长录音时间(ms)
				format: 'mp3',
				sampleRate: 16000,
				numberOfChannels: 1,
				encodeBitRate: 48000,
			});
			this.setData({
				isRecording: true,
				audioSrc: '',
				duration: 0,
			});
		},

		// 试听已录制音频
		bindPlayTap: function () {
			if (!this.data.audioSrc) return;

			if (!innerAudioContext) {
				innerAudioContext = wx.createInnerAudioContext();
				innerAudioContext.onEnded(() => {
					this.setData({ isPlaying: false });
				});
				innerAudioContext.onError(() => {
					this.setData({ isPlaying: false });
					pageHelper.showNoneToast('播放失败');
				});
			}

			if (this.data.isPlaying) {
				innerAudioContext.stop();
				this.setData({ isPlaying: false });
			} else {
				innerAudioContext.src = this.data.audioSrc;
				innerAudioContext.play();
				this.setData({ isPlaying: true });
			}
		},

		// 删除已录制音频
		bindDelTap: function () {
			let that = this;
			let callback = function () {
				if (innerAudioContext) innerAudioContext.stop();
				that.setData({
					audioSrc: '',
					isPlaying: false,
				});
				that.triggerEvent('upload', '');
			}
			pageHelper.showConfirm('确定要删除该语音吗？', callback);
		},
	}
})
