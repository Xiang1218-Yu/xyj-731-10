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
		_timer: null,        // 录音计时器
	},

	/**
	 * 生命周期方法
	 */
	lifetimes: {
		attached: function () {
			this._initRecorder();
		},
		detached: function () {
			// 释放音频资源与计时器
			if (this.data._timer) clearInterval(this.data._timer);
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
			recorderManager.onStart(() => {
				// 录音真正开始，启动计时
				this.setData({ isRecording: true, duration: 0 });
				this._startTimer();
			});

			recorderManager.onStop((res) => {
				this._stopTimer();
				this.setData({
					isRecording: false,
					audioSrc: res.tempFilePath,
				});
				// 抛出本地临时文件路径给父组件
				this.triggerEvent('upload', res.tempFilePath);
			});

			recorderManager.onError(() => {
				this._stopTimer();
				this.setData({ isRecording: false });
				pageHelper.showNoneToast('录音失败，请检查录音权限');
			});
		},

		// 启动录音计时器
		_startTimer: function () {
			if (this.data._timer) clearInterval(this.data._timer);
			let timer = setInterval(() => {
				let duration = this.data.duration + 1;
				this.setData({ duration });
				// 到达最长时长自动停止
				if (duration >= this.data.maxSecond) {
					recorderManager.stop();
				}
			}, 1000);
			this.data._timer = timer;
		},

		// 停止录音计时器
		_stopTimer: function () {
			if (this.data._timer) {
				clearInterval(this.data._timer);
				this.data._timer = null;
			}
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
