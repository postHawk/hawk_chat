(function ($) {
	var methods = {
		/**
		 * Инициализация плагина
		 * @param object options
		 * @returns void
		 */
		init: function (options) {
			if(!HAWK_API)
			{
				var _this = this;
				setTimeout(function () {
					_this.init(options);
				}, 500);
				return;
			}

			if(HAWK_API.initialized)
			{
				return;
			}

			settings = $.extend(settings, options);

			if(!settings.messageFormat)
			{
				throw 'Empty message format';
			}
			if(settings.userId === null || settings.userId === undefined)
			{
				throw 'User id not set';
			}

			settings.container = $(this);

			var $container = settings.container;
			var html = settings.chatBody;

			$container.html(html).data('hawk_chat', settings);

			HAWK_API.bind_handler('hawk.message', methods.onMessage());
			HAWK_API.bind_handler('hawk.initialized', methods.onInit());
			HAWK_API.bind_handler('hawk.get_by_group', methods.showUsers());

			$('#chat_send_message', $container).keyup(methods.send());
			methods.initTab();
			methods.registerUser();

			if(!settings.useTabs)
			{
				$(settings.tabsContainerSelector).hide();
			}

			if(!settings.inline)
			{
				if($container.draggable)
				{
					$('#chat').draggable({
						scroll: false,
						handle: settings.chatHeaderSelector
					});
				}
				else
				{
					console.error('Для перемещаемого чата необходимо наличие jquery ui draggable')
				}
			}

		},
		/**
		 * Инициализация основной закладки
		 * @param object settings
		 * @returns void
		 */
		initTab: function() {
			//создаём таб главного окна
			settings.container.find(settings.tabForCopySelector).click(methods.changeTab(settings));
			methods.addTab.call(settings.container, settings.groupName, true);
		},
		/**
		 * Регистрация пользователя в сервисе
		 * @param object settings
		 * @returns void
		 */
		registerUser: function() {
			$.post(settings.serverSideUrl, {
				user_id: settings.userId,
				group_id: [settings.groupName],
				action: 'register_user'
			}, function (data) {
				data = JSON.parse(data);
				if (!data.error)
				{
					HAWK_API.init({
						user_id: settings.userId,
						url: settings.serverUrl,
						debug: true
					});
				}
			});
		},
		/**
		 * Обработчик входящего сообщения
		 * @param {Object} settings настройки
		 * @returns {Function}
		 */
		onMessage: function () {
			return function(e, msg)	{

				if(msg.from === settings.userId)
				{
					return;
				}

				var vars = settings.messageFormat.match(/\{[\w]+\}/g);
				if(vars === null)
				{
					throw 'Invalid message format';
				}

				var str = settings.messageFormat;
				if(typeof msg.text === 'object')
				{
					vars
						.map(function(el){ return el.replace(/\{|\}/g, ''); })
						.forEach(function (el) {
							if(msg.text.hasOwnProperty(el))
							{
								var regexp = new RegExp('\\{' + el + '\\}', 'g');
								str = str.replace(regexp, msg.text[el]);
							}
						});
				}
				else
				{
					str = msg.text;
				}

				var panel = msg.to_group || msg.from;
				var $body = $('[data-hawk-panel_id="' + panel + '_panel"]');

				if(!$body.size())
				{
					settings.container.hawkChat('addTab', panel);
					$body = $('[data-hawk-panel_id="' + panel + '_panel"]');

					if(!msg.to_group && settings.onNewPrivate === 'function')
					{
						settings.onNewPrivate.call(settings.container, msg.from);
					}
				}

				if(!$body.is(':visible'))
				{
					var id = $body.data().hawkPanel_id;
					var tab_c = settings
						.container
						.find(settings.containertabSelector + '[data-href="' + id + '"] ' + settings.countNewMessageSelector);

					var count = 0 | tab_c.text().replace('+', '');

					tab_c.text('+' + ++count);
				}

				if(typeof settings.onInMessage === 'function')
				{
					str = settings.onInMessage.call(settings.container, msg, str);
				}

				if(!msg.to_group && settings.onPrivateMessage === 'function')
				{
					str = settings.onPrivateMessage.call(settings.container, msg, str);
				}

				$body.append(str);
			};
		},
		/**
		 * Callback после инициализации
		 * @param {Object} settings
		 * @returns {Function}
		 */
		onInit: function() {
			return function () {
				if(typeof settings.onInit === 'function')
				{
					settings.onInit.call(settings.container);
				}
				HAWK_API.get_users_by_group([settings.groupName]);
				setTimeout(function () {
					HAWK_API.get_users_by_group([settings.groupName]);
				}, 30000);
			};
		},
		/**
		 * Отображение списка пользователей
		 * @param {type} settings
		 * @returns {Function}
		 */
		showUsers: function() {
			return function (e, msg) {
				if (msg.result && msg.result.length)
				{
					HAWK_API.print_debug(msg);
					$('#chat_online_u,#chat_offline_u').empty();

					if(typeof settings.onUserUpdate === 'function')
					{
						settings.onUserUpdate.call(settings.container, msg.result);
					}

					msg.result.forEach(function (user) {
						var container = '#chat_online_u';

						var html = settings
								.userFormat
								.replace(/\{login\}|\{id\}/g, user.user)
						;
						html = $(html);
						var u_class = settings.onlineUserClass;
						if (!user.online && user.user != HAWK_API.get_user_id())
						{
							container = '#chat_offline_u';
							u_class = settings.offlineUserClass;
						}
						else if(user.user === HAWK_API.get_user_id())
						{
							u_class = settings.currentUserClass;
						}

						html.addClass(u_class);

						if(user.online && settings.useTabs)
						{
							html.click(methods.createPrivate(settings));
						}

						$(container).append(html);
					});
				}
			};
		},
		/**
		 * Отправка сообщения
		 * @param {type} settings
		 * @returns {Function}
		 */
		send: function ( ) {
			return function (e) {
				if(e.keyCode === 13)
				{
					var $this = $(this);

					var time = new Date().toLocaleString('ru', {
						year: "numeric",
						month: "2-digit",
						day: "numeric",
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit'
					});

					var str = settings
							.messageFormat
							.replace('{time}', time)
							.replace('{from_login}', settings.userId)
							.replace('{message}', $this.val())
					;

					var $str = $(str);
					$str.addClass('chat-message-curent-user');

					settings.container.find(settings.messagePanelSelector + '.active').append($str);
					var tab = settings.container.find(settings.tabSelector + '.active');
					var to = tab.attr('data-href').replace('_panel', '');
					if(tab.data().isGroup)
					{
						to = {group: [to]};
					}
					else
					{
						to = {user: to};
					}

					var msg = {
						to: to,
						text: {
							time: time,
							from_login: settings.userId,
							message: $this.val()
						}
					};

					if(typeof settings.onOutMessage === 'function')
					{
						settings.onOutMessage.call(settings.container, msg);
					}

					HAWK_API.send_message(msg);

					$this.val('');

				}
			};
		},
		/**
		 * Создание приватной вкладки
		 * @param {type} settings
		 * @returns {Function}
		 */
		createPrivate: function () {
			return function () {
				var id = $(this).data().hawkId;
				if(id != settings.userId)
				{
					settings.container.hawkChat('addTab', id);
				}
			};
		},
		/**
		 * Создаёт новый таб
		 * @param {String} id
		 * @param {Boolean} isGroup
		 * @returns {void}
		 */
		addTab: function(id, isGroup) {
			var container = $(this);
			var settings = container.data('hawk_chat');
			var tabs = container.find(settings.tabsContainerSelector);
			isGroup = isGroup || false;

			if(tabs.find('[data-href="' + id + '_panel' + '"]').size())
			{
				return ;
			}

			var tab = tabs.find(settings.tabForCopySelector).clone(true);
			tab
				.removeClass('main')
				.addClass('active')
				.attr('data-href', id + '_panel')
				.attr('data-is-group', isGroup)
				.css('display', 'table-cell')
				.find(settings.tabNameSelector)
				.html(id)
			;

			tabs
				.find(settings.tabSelector)
				.removeClass('active');

			tabs.append(tab);

			container.find(settings.messagePanelSelector).removeClass('active').hide();

			var panel = container.find('[data-hawk-panel_id="chat_main_panel"]').clone(true);
			panel
				.attr('data-hawk-panel_id', id + '_panel')
				.addClass('active')
				.show()
			;

			container.find(settings.textPanelSelector).before(panel);

		},
		/**
		 * Переключает табы
		 * @param {type} settings
		 * @returns {Function}
		 */
		changeTab: function() {
			return function () {
				var $this =  $(this);
				var href = $this.data().href;
				var body = $this.parents(settings.bodySelector);
				var old = body.find(settings.tabSelector + ' active');

				body.find(settings.messagePanelSelector).removeClass('active').hide();
				body.find('[data-hawk-panel_id="' + href + '"]').addClass('active').show();


				body.find(settings.tabSelector).removeClass('active');
				$this.addClass('active');
				$this.find(settings.countNewMessageSelector).empty();

				if(settings.onChangeTab === 'function')
				{
					settings.onChangeTab.call(settings.container, old, $this);
				}
			}
		},
		/**
		 * Дефолтный html-код чата
		 * @returns {String}
		 */
		getDeafaultHtml: function(){
			return '<div class="chat-container"> \
				<div id="" class="chat-header"> \
					<div class="chat-title">Post Hawk Chat</div> \
					<div class="chat-logo"> \
						<img src="/css/landing/logo_main.png"> \
					</div> \
				</div> \
				<div class="chat-body"> \
					<div class="chat-left-panel"> \
						<div class="chat-separator"><span>В сети</span></div> \
						<div class="chat-online-u" id="chat_online_u"></div> \
						<div class="chat-separator"><span>Не в сети</span></div> \
						<div class="chat-offline-u" id="chat_offline_u"></div> \
					</div> \
					<div class="chat-right-panel"> \
						<div class="chat-tabs">\
							<div style="display: none;" data-href="chat_main_panel" class="chat-tab main">\
								<span class="chat-tab-name"></span><span class="chat-tab-count-new"></span>\
							</div>\
						</div> \
						<div style="display: none;" data-hawk-panel_id="chat_main_panel" class="chat-mesasge-panel"></div> \
						<div class="chat-text-panel"> \
							<input id="chat_send_message" placeholder="Введите сообщение" class="chat-text-input" type="text"> \
						</div> \
					</div> \
				</div> \
			</div>';
		},
		/**
		 * Дефолтный формат сообщения
		 * @returns {String}
		 */
		getDefaultMessageFormat: function () {
			return '<div class="chat-row" title="{time}">\
				<span class="chat-row-login">{from_login}</span>: \
				<span class="chat-row-message">{message}</span>\
			</div>';
		},
		/**
		 * Дефолтный формат отображения пользователя
		 * @returns {String}
		 */
		getDefaultUserFormat: function () {
			return '<div data-hawk-id="{id}">{login}</div>';
		},
		/**
		 * Устанавливает заголовок главного таба
		 * @param {type} name
		 * @returns {undefined}
		 */
		setTitleMainTab: function (name) {
			var settings = $(this).data('hawk_chat');
			$(this)
				.find(settings.tabSelector)
				.eq(0)
				.find(settings.tabNameSelector)
				.html(name)
			;
		}
	};

	var settings = {
		/**
		 * @param string chatBody "тело" чата
		 */
		chatBody: methods.getDeafaultHtml(),
		/**
		 * @param string userId id пользователя,
		 * который будет зарегистрирован в сервсе
		 */
		userId: null,
		/**
		 * @param string groupName название группы
		 * для регистрации в сервисе, также
		 * отображается на главной вкладке
		 */
		groupName: 'default_group',
		/**
		 * @param string serverUrl адрес сервера Post Hawk
		 */
		serverUrl: 'wss://post-hawk.com:2222',
		/**
		 * @param string messageFormat формать строки
		 * для отображения сообщений в чате
		 */
		messageFormat: methods.getDefaultMessageFormat(),
		/**
		 * @param string userFormat формать строки
		 * для отображения пользователей в списке
		 */
		userFormat: methods.getDefaultUserFormat(),
		/**
		 * @param string serverSideUrl адрес
		 * скрипта для регистрации пользователей
		 */
		serverSideUrl: '/chat.php',
		/**
		 * @param string onlineUserClass класс,
		 * который будет присвоен онлайн-пользователю
		 */
		onlineUserClass: 'chat-online',
		/**
		 * @param string offlineUserClass класс,
		 * который будет присвоен оффлайн-пользователю
		 */
		offlineUserClass: 'chat-offline',
		/**
		 * @param string offlineUserClass класс,
		 * который будет присвоен текущему пользователю
		 */
		currentUserClass: 'chat-current',
		/**
		 * @param string offlineUserClass селектор
		 * для выборки шаблона таба
		 */
		tabForCopySelector: '.chat-tab.main',
		/**
		 * @param string offlineUserClass селектор
		 * для выборки контейнера табов
		 */
		tabsContainerSelector: '.chat-tabs',
		/**
		 * @param string offlineUserClass селектор
		 * для выборки одного таба
		 */
		tabSelector: '.chat-tab',
		/**
		 * @param string offlineUserClass селектор
		 * для выборки контейнера имени таба
		 */
		tabNameSelector: '.chat-tab-name',
		/**
		 * @param string offlineUserClass селектор
		 * для выборки контейнера сообщений чата
		 */
		messagePanelSelector: '.chat-mesasge-panel',
		/**
		 * @param string offlineUserClass селектор
		 * для выборки контйнера с текстом для отправки
		 */
		textPanelSelector: '.chat-text-panel',
		/**
		 * @param string offlineUserClass селектор
		 * для выборки основного контейнера чата
		 */
		bodySelector: '.chat-body',
		/**
		 * @param string offlineUserClass селектор
		 * для выборки контейнера для отображения новых сообщений
		 */
		countNewMessageSelector: '.chat-tab-count-new',
		/**
		 * @param string chatHeaderSelector селектор
		 * для выборки заголовка чата
		 */
		chatHeaderSelector: '.chat-header',
		/**
		 * @param boolean inline статичный чат или перемещаемый
		 */
		inline: true,
		/**
		 * @param boolean useTabs использовать ли табы
		 */
		useTabs: true,
		/**
		 * callback, вызываемый после инициализиции плагина
		 */
		onInit: function () {},
		/**
		 * callback, вызываемый при входящем сообщении
		 * в нём можно модифицировать строку,
		 * которую увидит пользователь
		 *
		 * @param object msg объект сообщения
		 * @param string str сформированная строка
		 * @returns string
		 */
		onInMessage: function (msg, str) {
			return str;
		},
		/**
		 * callback, вызываемый перед отправкой сообщения
		 * в нём можно модифицировать объект,
		 * который будет отправлен
		 * @param object msg объект сообщения
		 *
		 */
		onOutMessage: function (msg) {},
		/**
		 * callback, вызываемый при поступлении сообщени в приват
		 * в нём можно модифицировать строку,
		 * которую увидит пользователь
		 *
		 * @param object msg объект сообщения
		 * @param string str сформированная строка
		 * @returns string
		 */
		onPrivateMessage: function (msg, str) {
			return str;
		},
		/**
		 * callback, вызываемый при создании новой приватной вкладки
		 * @param string from id пользователя, который прислал сообщение
		 */
		onNewPrivate: function (from) {},
		/**
		 * callback, вызываемый после обновления списка пользователей,
		 * который в нём можно модифицировать
		 *
		 * @param array list массив пользователей
		 * @return array
		 */
		onUserUpdate: function (list) {
			return list;
		},
		/**
		 * callback, вызываемый при смене вкладок
		 *
		 * @param object old_tab предыдущая вкладка
		 * @param object new_tab новая вкладка
		 */
		onChangeTab: function (old_tab, new_tab) {}
	};

	$.fn.hawkChat = function (method) {

		// логика вызова метода
		if (methods[method]) {
			return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
		}
		else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		}
		else {
			$.error('Метод с именем ' + method + ' не существует для jQuery.hawkChat');
		}
	};

})(jQuery);