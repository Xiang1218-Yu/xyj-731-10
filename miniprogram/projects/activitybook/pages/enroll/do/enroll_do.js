const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const dataHelper = require('../../../../../helper/data_helper.js');
const EnrollBiz = require('../../../biz/enroll_biz.js');
const validate = require('../../../../../helper/validate.js');
const PublicBiz = require('../../../../../comm/biz/public_biz.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const PassportBiz = require('../../../../../comm/biz/passport_biz.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		mediaPics: [],
		voicePath: '',
		voiceDuration: 0,
		voiceFileID: '',
		location: null,
		isRecording: false
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		ProjectBiz.initPage(this);

		if (!await PassportBiz.loginMustBackWin(this)) return;

		if (!pageHelper.getOptions(this, options)) return;

		this.setData(EnrollBiz.initJoinFormData());
		this.setData({
			isLoad: true
		});

		this._recorderManager = wx.getRecorderManager();
		this._initRecorder();

		this._innerAudioContext = wx.createInnerAudioContext();
		this._innerAudioContext.onError(() => {
			pageHelper.showNoneToast('语音播放失败');
		});
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () { },

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () { },

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () {
		if (this._recorderManager && this.data.isRecording) {
			this._recorderManager.stop();
		}
		if (this._innerAudioContext) {
			this._innerAudioContext.destroy();
			this._innerAudioContext = null;
		}
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	/** 初始化录音 */
	_initRecorder: function () {
		this._recorderManager.onStart(() => {
			this.setData({
				isRecording: true,
				voiceDuration: 0
			});
			this._recordStartTime = Date.now();
		});

		this._recorderManager.onStop(async (res) => {
			let duration = Math.round((res.duration || 0) / 1000);
			this.setData({
				isRecording: false
			});

			if (!res.tempFilePath || duration < 1) {
				pageHelper.showNoneToast('录音时间太短');
				return;
			}

			wx.showLoading({
				title: '上传中...',
				mask: true
			});

			try {
				let rd = dataHelper.genRandomNum(1000000, 9999999);
				// 语音文件与打卡图片放在同一业务目录 enroll/join 下，
				// 避免云存储安全规则仅放行特定目录导致 -503002 storage permission denied
				let cloudPath = 'enroll/join/' + this.data.id + '/voice_' + rd + '.mp3';
				if (pageHelper.getPID()) {
					cloudPath = pageHelper.getPID() + '/' + cloudPath;
				}

				// 带重试的上传，避免网络抖动导致语音文件引用丢失
				let uploadRes = await this._uploadFileWithRetry(res.tempFilePath, cloudPath, 3);

				this.setData({
					voicePath: res.tempFilePath,
					voiceDuration: duration,
					voiceFileID: uploadRes.fileID
				});
				pageHelper.showSuccToast('语音已上传', 1000);
			} catch (err) {
				console.log(err);
				// 上传最终失败：清空本地临时引用，防止提交一个无效的语音
				this.setData({
					voicePath: '',
					voiceDuration: 0,
					voiceFileID: ''
				});
				// 区分存储权限错误与网络错误，给出更有针对性的提示
				let errMsg = (err && err.errMsg) ? err.errMsg : '';
				if (errMsg.indexOf('-503002') > -1 || errMsg.indexOf('permission') > -1) {
					pageHelper.showModal('语音上传被云存储拒绝，请检查云开发存储安全规则是否允许上传到 enroll/join 目录');
				} else {
					pageHelper.showModal('语音上传失败，请检查网络后重试录音');
				}
			}
			finally {
				wx.hideLoading();
			}
		});

		this._recorderManager.onError((err) => {
			this.setData({
				isRecording: false
			});
			console.log(err);
			pageHelper.showModal('录音失败，请检查录音权限');
		});
	},

	/**
	 * 带重试的云存储上传
	 * @param {string} filePath 本地临时文件路径
	 * @param {string} cloudPath 云存储路径
	 * @param {number} retries 剩余重试次数（不含首次）
	 * @returns {Promise<WechatMiniprogram.UploadFileSuccessCallbackResult>}
	 */
	_uploadFileWithRetry: function (filePath, cloudPath, retries = 3) {
		let attempt = 0;
		let delay = 500; // 首次重试间隔 500ms，之后指数退避
		const maxDelay = 3000;

		const doUpload = () => {
			return wx.cloud.uploadFile({ cloudPath, filePath }).catch(err => {
				attempt++;
				if (attempt > retries) {
					// 重试用尽，抛出最后一次错误
					return Promise.reject(err);
				}
				console.log('[voice upload] 第' + attempt + '次重试，' + delay + 'ms 后重试', err);
				return new Promise(resolve => setTimeout(resolve, delay)).then(() => {
					delay = Math.min(delay * 2, maxDelay); // 指数退避
					return doUpload();
				});
			});
		};

		return doUpload();
	},

	/** 选择图片 */
	bindChoosePics: async function () {
		if (this.data.mediaPics.length >= 9) return;

		let count = 9 - this.data.mediaPics.length;
		let that = this;

		wx.chooseMedia({
			count,
			mediaType: ['image'],
			sourceType: ['album', 'camera'],
			sizeType: ['compressed'],
			success: async (res) => {
				wx.showLoading({
					title: '上传中...',
					mask: true
				});

				try {
					let mediaPics = that.data.mediaPics;
					for (let k = 0; k < res.tempFiles.length; k++) {
						let fileID = await cloudHelper.transTempPicOne(res.tempFiles[k].tempFilePath, 'enroll/join/', that.data.id, false);
						if (fileID) mediaPics.push(fileID);
					}
					that.setData({ mediaPics });
				} catch (err) {
					console.log(err);
					pageHelper.showNoneToast('图片上传失败');
				}
				finally {
					wx.hideLoading();
				}
			}
		});
	},

	/** 预览图片 */
	bindPreviewPic: function (e) {
		let url = pageHelper.dataset(e, 'url');
		wx.previewImage({
			current: url,
			urls: this.data.mediaPics
		});
	},

	/** 删除图片 */
	bindDelPic: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let mediaPics = this.data.mediaPics;
		mediaPics.splice(idx, 1);
		this.setData({ mediaPics });
	},

	/** 开始/停止录音 */
	bindRecordVoice: function () {
		if (this.data.isRecording) return;

		this._recorderManager.start({
			duration: 60000,
			sampleRate: 44100,
			numberOfChannels: 1,
			encodeBitRate: 192000,
			format: 'mp3'
		});
	},

	bindStopVoice: function () {
		if (!this.data.isRecording) return;
		this._recorderManager.stop();
	},

	/** 播放语音 */
	bindPlayVoice: function () {
		if (!this.data.voicePath) return;

		this._innerAudioContext.stop();
		this._innerAudioContext.src = this.data.voicePath;
		this._innerAudioContext.play();
	},

	/** 重录语音 */
	bindReRecordVoice: function () {
		this.setData({
			voicePath: '',
			voiceDuration: 0,
			voiceFileID: ''
		});
	},

	/** 删除语音 */
	bindDelVoice: function () {
		let callback = () => {
			this._innerAudioContext.stop();
			this.setData({
				voicePath: '',
				voiceDuration: 0,
				voiceFileID: ''
			});
		};
		pageHelper.showConfirm('确定删除该语音吗？', callback);
	},

	/** 选择位置 */
	bindChooseLocation: function () {
		wx.chooseLocation({
			success: (res) => {
				this.setData({
					location: {
						name: res.name || '',
						address: res.address || '',
						latitude: res.latitude,
						longitude: res.longitude
					}
				});
			},
			fail: (err) => {
				if (err && err.errMsg && err.errMsg.includes('cancel')) return;
				pageHelper.showModal('获取位置失败，请检查位置权限');
			}
		});
	},

	/** 删除位置 */
	bindDelLocation: function () {
		let callback = () => {
			this.setData({
				location: null
			});
		};
		pageHelper.showConfirm('确定删除该位置吗？', callback);
	},


	bindFormSubmit: async function () {

		let data = this.data;
		data = validate.check(data, EnrollBiz.CHECK_JOIN_FORM, this);
		if (!data) return;


		let forms = this.selectComponent("#cmpt-form").getForms(true);
		if (!forms) return;
		data.forms = forms;
		data.enrollId = this.data.id;
		data.pics = this.data.mediaPics;
		if (this.data.location) data.location = this.data.location;

		if (this.data.voiceFileID) {
			data.voice = {
				tempFileURL: this.data.voiceFileID,
				duration: this.data.voiceDuration
			};
		}

		try {

			// 创建
			let result = await cloudHelper.callCloudSumbit('enroll/join', data);
			let enrollJoinId = result.data.enrollJoinId;

			// 图片
			await cloudHelper.transFormsTempPics(forms, 'enroll/join/', enrollJoinId, 'enroll/update_join_forms');

			let callback = async function () {
				PublicBiz.removeCacheList('admin-enroll-join-list');
				PublicBiz.removeCacheList('enroll-join-list');

				let parent = pageHelper.getPrevPage(2);
				if (parent) {
					parent._loadDetail();
				}
				wx.navigateBack();

			}
			pageHelper.showSuccToast('打卡成功', 2000, callback);

		} catch (err) {
			console.log(err);
		}
	},


})
