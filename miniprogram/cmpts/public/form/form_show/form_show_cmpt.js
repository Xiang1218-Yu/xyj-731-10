const pageHelper = require('../../../../helper/page_helper.js');
const helper = require('../../../../helper/helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const cacheHelper = require('../../../../helper/cache_helper.js');
const dataHelper = require('../../../../helper/data_helper.js');
const formSetHelper = require('../form_set_helper.js');
const rowsSetHelper = require('../../rows/rows_set_helper.js');
const validate = require('../../../../helper/validate.js');
const setting = require('../../../../setting/setting.js');

const CACHE_FORM_SHOW_KEY = 'FORM_SHOW_CMPT';
const CACHE_FORM_SHOW_TIME = 86400 * 365;

Component({
	options: {
		addGlobalClass: true
	},

	/**
	 * 组件的属性列表
	 */
	properties: {
		mark: { // 组件标识，用于区分缓存
			type: String,
			value: '',
		},
		source: { // 来源 admin /user
			type: String,
			value: 'user',
		},
		fields: { // 表单字段属性{mark,val,type,must,selectOptions,desc,title}
			type: Array,
			value: [],
		},
		forms: { // 表单值
			type: Array,
			value: [], // {mark,title,val,type}
		},
		doShow: { //仅仅显示
			type: Boolean,
			value: false,
		},
		isConfirm: { //是否显示核对信息modal
			type: Boolean,
			value: true,
		},
		isCacheMatch: { //是否开启缓存匹配
			type: Boolean,
			value: true,
		},
		isDefMatch: { //是否开启缺省值匹配
			type: Boolean,
			value: true,
		},
	},

	/**
	 * 组件的初始数据
	 */
	data: {
		cacheName: '',
		isLoad: false,
		showCheckModal: false,
		mobileCheck: setting.MOBILE_CHECK,

		// 语音录制相关
		isRecording: false,
		recordingIdx: -1,
		recordTime: 0,
		voiceUploading: false, // 保留字段，语音改为提交时统一上传
		voicePlayingIdx: -1,
	},

	/**
	 * 生命周期方法
	 */
	lifetimes: {
		attached: function () {
		},

		ready: function () {
			if (this.data.isCacheMatch) {
				let cacheName = CACHE_FORM_SHOW_KEY + '_' + this.data.mark;
				this.setData({
					cacheName
				});
			}

			this._init();

		},

		detached: function () {
			// 在组件实例被从页面节点树移除时执行
			// 销毁音频播放器
			if (this._audioCtx) {
				this._audioCtx.destroy();
				this._audioCtx = null;
			}
			// 停止录音
			if (this._recorderManager) {
				try {
					this._recorderManager.stop();
				} catch (e) { }
				this._recorderManager = null;
			}
			// 清除录音计时器
			if (this._recordTimer) {
				clearInterval(this._recordTimer);
				this._recordTimer = null;
			}
		},
	},

	/**
	 * 组件的方法列表
	 */
	methods: {
		reload: function () {
			// 重新加载，如果没有设置扩展字段，则全部form属性清空
			this._init();
		},
		_init: function () {
			let fields = formSetHelper.initFields(this.data.fields);
			let newForms = [];


			for (let k = 0; k < fields.length; k++) {
				let node = {};
				node.mark = fields[k].mark;
				node.title = fields[k].title;
				node.type = fields[k].type;

				// 判断是否有表单值（依次从表单值，缓存，默认值）
				let val = this._getOneValForm(fields[k].mark, fields[k].title, fields[k].type);
				if (val === null) val = '';

				// 数据类型修正
				val = this._fixType(fields[k].type, val);
				node.val = val;
				fields[k].val = val;

				// rows类型
				if (node.type == 'rows') {
					//如果不足最低，则补足 
					if (!helper.isDefined(fields[k].ext.minCnt)) fields[k].ext.minCnt = 2; 
					if (val.length < fields[k].ext.minCnt) {
						let step = fields[k].ext.minCnt - val.length;
						for (let n = 1; n <= step; n++)
							val.push(dataHelper.deepClone(rowsSetHelper.BASE_ROW));
					}
					node.val = val;
					fields[k].val = val;

					// 增加一个条目数量（不用数据去渲染，仅渲染条目数量）
					fields[k].rowsCnt = val.length;
				}


				newForms.push(node);
			}


			this.setData({
				forms: newForms,
				fields,
				isLoad: true
			});
			//this.triggerEvent('forms', newForms);
		},

		// 根据mark和type获取上次值或者缓存值或者缺省值
		_getOneValForm: function (mark, title, type) {
		 
			if (type == 'line') return title;

			let ret = null;

			// **** 对传入的默认值匹配
			let forms = this.data.forms;

			if (!forms || !Array.isArray(forms)) forms = [];
			for (let k = 0; k < forms.length; k++) {
				if (forms[k].mark == mark && forms[k].type == type) { // 优先匹配mark
					ret = forms[k].val;
					break;
				}

				if (forms[k].title == title && forms[k].type == type) { // 再则匹配名称
					ret = forms[k].val;
					break;
				}

				if (type == 'mobile' && forms[k].type == 'mobile') {
					ret = forms[k].val;
					break;
				}

				if (type == 'idcard' && forms[k].type == 'idcard') {
					ret = forms[k].val;
					break;
				}
			}
			if (ret === undefined) ret = null;

			// **** 对缓存匹配 图片、语音、富文本和多条目不读取缓存 
			if (ret === null && this.data.isCacheMatch
				&& (type != 'image' && type != 'voice' && type != 'content' && type != 'rows')) {
				let caches = cacheHelper.get(this.data.cacheName);
				if (caches && Array.isArray(caches)) {
					for (let k = 0; k < caches.length; k++) {
						if (caches[k].mark == mark && caches[k].type == type) { // 优先匹配mark
							ret = caches[k].val;
							break;
						}

						if (caches[k].title == title && caches[k].type == type) { // 再则匹配名称
							ret = caches[k].val;
							break;
						}

						if (type == 'mobile' && caches[k].type == 'mobile') {
							ret = caches[k].val;
							break;
						}

						if (type == 'idcard' && caches[k].type == 'idcard') {
							ret = caches[k].val;
							break;
						}
					}
				}
			}
			if (ret === undefined) ret = null;

			// 缺省值匹配
			if (ret === null && this.data.isDefMatch) {
				let fields = this.data.fields;
				for (let k = 0; k < fields.length; k++) {
					if (fields[k].mark == mark
						&& helper.isDefined(fields[k].def)
						&& fields[k].def != null // 默认值为空
					) {
						ret = fields[k].def;
						break;
					}
				}
			}

			return ret;
		},

		// 原始form没有对应值, 给予默认值; 或者类型不对，修正
		_fixType: function (type, val) {

			if (type == 'line') return val;

			if (type != 'switch' && type != 'checkbox' && type != 'area' && type != 'content' && type != 'image' && type != 'rows' && type != 'location') {
				// switch(bool),checkbox(array), area(array), content(array), location(object) 不处理，其他做类型处理

				if (typeof val === 'object' && !Array.isArray(val)) {
					// 对象要被处理为空串，数组做trim不处理(typeof数组也是object)
					val = '';
				}
				else if (val === undefined) {
					// 当form里没有值的情况
					val = '';
				}
				else
					val = String(val).trim(); // 前后去空格
			}

			// 原始form 有对应值，但是类型不正确
			switch (type) {
				case 'image': {
					// 不支持字符串缺省值 
					if (!Array.isArray(val)) return [];
					break;
				}
				case 'voice': {
					// 语音为字符串文件ID
					if (typeof val === 'object') return '';
					if (val === undefined || val === null) return '';
					val = String(val).trim();
					break;
				}
				case 'location': {
					// 地理位置为对象 {name, address, latitude, longitude}
					if (val === undefined || val === null || val === '') return '';
					if (typeof val === 'string') {
						// 尝试解析字符串形式的位置
						try {
							val = JSON.parse(val);
						} catch (e) {
							return '';
						}
					}
					if (typeof val !== 'object' || !val.name) return '';
					break;
				}
				case 'content': {
					// 支持字符串缺省值
					if (typeof val === 'string') {
						if (val)
							return [{ type: 'text', val: val.trim() }];
						else
							return [];
					}

					if (!Array.isArray(val)) return [];
					break;
				}
				case 'rows': { // 多条目默认一条
					if (!Array.isArray(val)) return [dataHelper.deepClone(rowsSetHelper.BASE_ROW)];
					break;
				}
				case 'area': {
					if (!Array.isArray(val) || val.length != 3) return ''; //TODO?
					break;
				}
				case 'switch': {
					if (typeof (val) != 'boolean') return true;
					break;
				}
				case 'checkbox': {
					if (!Array.isArray(val)) return [String(val).trim()]; //尝试转为数组来匹配
					break;
				}
				case 'year': {
					if (!val || validate.checkYear(val)) return '';
					break;
				}
				case 'month': {
					if (!val || validate.checkYearMonth(val)) return '';
					break;
				}
				case 'date': {
					if (!val || validate.checkDate(val)) return '';
					break;
				}
				case 'hourminute': {
					if (!val || validate.checkHourMinute(val)) return '';
					break;
				}
				case 'int': { // 整数(字符形式) 
					if (!val || validate.checkInt(val)) return '';
					break;
				}
				case 'digit': { // 小数(字符形式) 
					if (!val || validate.checkDigit(val)) return '';
					break;
				}
				default: {

				}
			}

			return val;
		},

		_setForm: function (idx, val, isSetData = true) {
			let forms = this.data.forms;
			let fields = this.data.fields;
			fields[idx].val = val;
			forms[idx].val = val;

			// TODO是否需要，影响性能 
			let typeArr = ['rows', 'text', 'textarea', 'digit', 'idcard', 'int', 'tag'];

			// 去掉focus
			for (let k = 0; k < fields.length; k++) {
				if (helper.isDefined(fields[k].focus)) {
					delete fields[k].focus;
				}
			}

			// 提高性能
			let formsName = 'forms[' + idx + '].val';
			let fieldsName = 'fields[' + idx + '].val';

			// 是否渲染到页面
			if (isSetData) {
			this.setData({
				[formsName]: val,
				[fieldsName]: val,
			});
			}
			else {
				// rows的输入不渲染，但增加一个条目数量
				if (this.data.forms[idx].type == 'rows') {
					this.setData({
						['fields[' + idx + '].rowsCnt']: val.length,
					});
				}
				else {
					// 不需要在界面上set数据 eg.rows的输入不渲染
					this.data[formsName] = val;
					this.data[fieldsName] = val;
				}
			}


			//this.triggerEvent('forms', forms);
		},


		bindImgUploadCmpt: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail;
			this._setForm(idx, val);
		},

		/**
		 * 语音上传入口：弹出选择菜单
		 */
		bindVoiceUpload: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let that = this;

			wx.showActionSheet({
				itemList: ['录制语音', '从聊天记录选择'],
				success(res) {
					if (res.tapIndex === 0) {
						// 录制语音
						that.bindVoiceRecord(e);
					} else if (res.tapIndex === 1) {
						// 从聊天记录选择
						that.bindVoiceChoose(e);
					}
				}
			});
		},

		/**
		 * 语音录制按钮：开始/停止录音
		 */
		bindVoiceRecord: function (e) {
			let idx = pageHelper.dataset(e, 'idx');

			if (this.data.isRecording) {
				// 停止录音
				this._stopRecording(idx);
			} else {
				// 开始录音
				this._startRecording(idx);
			}
		},

		/**
		 * 开始录音
		 */
		_startRecording: function (idx) {
			let that = this;

			// 记录当前录音字段索引
			this._currentRecordIdx = idx;

			// 初始化录音管理器
			if (!this._recorderManager) {
				this._recorderManager = wx.getRecorderManager();

				this._recorderManager.onStart(() => {
					that.setData({
						isRecording: true,
						recordingIdx: that._currentRecordIdx,
						recordTime: 0
					});
					// 录音计时
					that._recordTimer = setInterval(() => {
						let t = that.data.recordTime + 1;
						that.setData({ recordTime: t });
						// 最长60秒自动停止
						if (t >= 60) {
							that._stopRecording();
						}
					}, 1000);
				});

				this._recorderManager.onStop((res) => {
					// 清除计时器
					if (that._recordTimer) {
						clearInterval(that._recordTimer);
						that._recordTimer = null;
					}
					that.setData({
						isRecording: false,
						recordingIdx: -1,
						recordTime: 0
					});

					// 录音完成，直接保存临时文件路径（提交时统一上传）
					if (res.tempFilePath && that._currentRecordIdx !== undefined) {
						that._setForm(that._currentRecordIdx, res.tempFilePath);
					}
					that._currentRecordIdx = undefined;
				});

				this._recorderManager.onError((err) => {
					console.error('录音错误', err);
					if (that._recordTimer) {
						clearInterval(that._recordTimer);
						that._recordTimer = null;
					}
					that.setData({
						isRecording: false,
						recordingIdx: -1,
						recordTime: 0
					});
					wx.showToast({
						title: '录音失败，请检查权限',
						icon: 'none'
					});
				});
			}

			// 开始录音，mp3格式，最长60秒
			this._recorderManager.start({
				duration: 60000,
				format: 'mp3',
				sampleRate: 44100,
				numberOfChannels: 1,
				encodeBitRate: 192000
			});

			wx.showToast({
				title: '开始录音',
				icon: 'none',
				duration: 1000
			});
		},

		/**
		 * 停止录音
		 */
		_stopRecording: function () {
			if (this._recorderManager) {
				this._recorderManager.stop();
			}
		},

		/**
		 * 从聊天记录选择语音文件
		 */
		bindVoiceChoose: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let that = this;

			wx.chooseMessageFile({
				count: 1,
				type: 'file',
				extension: ['mp3', 'm4a', 'wav', 'aac', 'silk'],
				success(res) {
					if (res.tempFiles && res.tempFiles.length > 0) {
						let tempFile = res.tempFiles[0];
						// 检查文件大小（限制10MB）
						if (tempFile.size > 10 * 1024 * 1024) {
							return pageHelper.showModal('语音文件大小不能超过10MB');
						}
						// 直接保存临时文件路径（提交时统一上传）
						that._setForm(idx, tempFile.path);
					}
				},
				fail(err) {
					console.log('选择文件取消', err);
				}
			});
		},

		/**
		 * 播放/暂停语音
		 */
		bindVoicePlay: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let fileID = this.data.forms[idx].val;

			if (!fileID) return;

			// 如果正在播放，则停止
			if (this._isPlaying && this._playingIdx === idx) {
				if (this._audioCtx) {
					this._audioCtx.stop();
				}
				this._isPlaying = false;
				this._playingIdx = -1;
				this.setData({ voicePlayingIdx: -1 });
				return;
			}

			let that = this;

			// 初始化音频播放器
			if (!this._audioCtx) {
				this._audioCtx = wx.createInnerAudioContext();

				this._audioCtx.onPlay(() => {
					that._isPlaying = true;
					that.setData({ voicePlayingIdx: that._playingIdx });
				});

				this._audioCtx.onEnded(() => {
					that._isPlaying = false;
					that._playingIdx = -1;
					that.setData({ voicePlayingIdx: -1 });
				});

				this._audioCtx.onError((err) => {
					console.error('语音播放错误', err);
					that._isPlaying = false;
					that._playingIdx = -1;
					that.setData({ voicePlayingIdx: -1 });
					wx.showToast({
						title: '播放失败',
						icon: 'none'
					});
				});

				this._audioCtx.onStop(() => {
					that._isPlaying = false;
					that._playingIdx = -1;
					that.setData({ voicePlayingIdx: -1 });
				});
			}

			// 如果是云文件ID，需要先获取临时链接
			if (fileID.startsWith('cloud://')) {
				wx.cloud.getTempFileURL({
					fileList: [fileID],
					success(res) {
						if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
							that._playingIdx = idx;
							that._audioCtx.src = res.fileList[0].tempFileURL;
							that._audioCtx.play();
						} else {
							wx.showToast({
								title: '获取语音链接失败',
								icon: 'none'
							});
						}
					},
					fail(err) {
						console.error('获取临时链接失败', err);
						wx.showToast({
							title: '播放失败',
							icon: 'none'
						});
					}
				});
			} else {
				// 本地临时文件直接播放
				this._playingIdx = idx;
				this._audioCtx.src = fileID;
				this._audioCtx.play();
			}
		},

		/**
		 * 删除语音（仅清空表单值，云端文件由后端提交时统一处理）
		 */
		bindVoiceDelete: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let that = this;
			pageHelper.showConfirm('确定要删除该语音吗？', function () {
				// 停止播放
				if (that._isPlaying && that._playingIdx === idx) {
					if (that._audioCtx) that._audioCtx.stop();
					that._isPlaying = false;
					that._playingIdx = -1;
					that.setData({ voicePlayingIdx: -1 });
				}
				// 只清空表单值，临时文件无需手动删除；云端旧文件由后端处理
				that._setForm(idx, '');
			});
		},

		/**
		 * 选择地理位置
		 */
		bindLocationChoose: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let that = this;

			wx.chooseLocation({
				success(res) {
					// 设置表单值为位置对象
					let location = {
						name: res.name,
						address: res.address,
						latitude: res.latitude,
						longitude: res.longitude
					};
					that._setForm(idx, location);
				},
				fail(err) {
					console.log('选择位置取消或失败', err);
				}
			});
		},

		/**
		 * 在地图中打开位置
		 */
		bindLocationOpen: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let location = this.data.forms[idx].val;

			if (!location || !location.latitude) return;

			wx.openLocation({
				latitude: location.latitude,
				longitude: location.longitude,
				name: location.name || '',
				address: location.address || '',
				scale: 18
			});
		},

		/**
		 * 清除已选择的位置
		 */
		bindLocationDelete: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let that = this;
			pageHelper.showConfirm('确定要清除该位置吗？', function () {
				that._setForm(idx, '');
			});
		},

		bindLineBlur: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail.value.trim();
			this._setForm(idx, val);
		},

		bindMultiBlur: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail.value;
			this._setForm(idx, val);
		},

		bindDayChange: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail.value.trim();
			this._setForm(idx, val);
		},

		bindAreaChange: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail.value;
			this._setForm(idx, val);
		},

		bindSelectCmpt: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail.trim();
			this._setForm(idx, val);
		},

		bindCheckBoxCmpt: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail;
			this._setForm(idx, val);
		},

		bindRadioCmpt: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail;
			this._setForm(idx, val);
		},

		bindRowsCmpt: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail;
			this._setForm(idx, val, false); //rows为独立控件，不需要在界面上set数据
		},

		switchModel: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			let val = e.detail.value;
			this._setForm(idx, val);
		},

		bindGetPhoneNumber: async function (e) {
			if (e.detail.errMsg == "getPhoneNumber:ok") {

				let cloudID = e.detail.cloudID;
				let params = {
					cloudID
				};
				let opt = {
					title: '手机验证中'
				};
				await cloudHelper.callCloudSumbit('passport/phone', params, opt).then(res => {
					let phone = res.data;
					if (!phone || phone.length < 11)
						wx.showToast({
							title: '手机号码获取失败，请重新绑定手机号码',
							icon: 'none',
							duration: 2000
						});
					else {
						let idx = pageHelper.dataset(e, 'idx');
						this._setForm(idx, phone);
					}
				});
			} else
				wx.showToast({
					title: '手机号码获取失败，请重新绑定手机号码',
					icon: 'none'
				});
		},

		checkForms: function () {
			// 写缓存
			if (this.data.isCacheMatch) {
				cacheHelper.set(this.data.cacheName, this.data.forms, CACHE_FORM_SHOW_TIME);
			}

			let ret = formSetHelper.checkForm(this.data.fields, this.data.forms, this);

			this.setData({
				fields: this.data.fields
			});

			if (!ret) return;

			if (this.data.isConfirm) { //是否显示确认信息
				this.setData({
					showCheckModal: true
				});
			} else {
				cacheHelper.remove(this.data.cacheName);
				this.triggerEvent('submit', this.data.forms);
			}

		},

		bindSubmitCmpt: function () {
			this.setData({
				showCheckModal: false
			});
			cacheHelper.remove(this.data.cacheName);
			this.triggerEvent('submit', this.data.forms);
		},

		url: function (e) {
			pageHelper.url(e, this);
		},

		getForms: function (isCheckForm = false) {
			if (isCheckForm) {
				// 是否数据校验
				let ret = formSetHelper.checkForm(this.data.fields, this.data.forms, this);

				this.setData({
					fields: this.data.fields
				});

				if (!ret) return false;
			}

			// 写缓存
			if (this.data.isCacheMatch) {
				cacheHelper.set(this.data.cacheName, this.data.forms, CACHE_FORM_SHOW_TIME);
			}

			return this.data.forms;
		},

		getOneFormVal(formName) {
			// 取某个表单值
			let forms = this.data.forms;
			for (let k = 0; k < forms.length; k++) {
				if (formName == forms[k].mark) {
					return forms[k].val;
				}
			}

			return null;
		},

		setOneFormVal(formName, val) {
			// 设定某个表单值
			let forms = this.data.forms;
			let fields = this.data.fields;
			for (let k = 0; k < forms.length; k++) {
				if (formName == forms[k].mark) {
					forms[k].val = val;
					fields[k].val = val;
					break;
				}
			}
			this.setData({
				fields,
				forms
			});
		}
	},

})