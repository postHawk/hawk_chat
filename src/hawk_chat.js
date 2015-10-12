(function ($) {
	var users = {
		online: [],
		offline: []
	};
	var methods = {
		/**
		 * Инициализация плагина
		 * @param {Object} options объект настроек
		 * @returns void
		 */
		init: function (options) {
			//дожидаемся загрузки апи
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

			if(!settings.inMessageFormat)
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

			//биндим основные обработчики событий
			HAWK_API.bind_handler('message', methods.onMessage);
			HAWK_API.bind_handler('initialized', methods.onInit);
			HAWK_API.bind_handler('get_by_group', methods.showUsers);
			HAWK_API.bind_handler('get_group_by_simple_user', methods.showGroups);
			HAWK_API.bind_handler('remove_from_groups', function () {
				HAWK_API.get_groups_by_user();
			});

			$(settings.textInputSelector, $container).keyup(methods.send);
			//инициализируем первый таб и регистрируем пользователя в группе
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
					console.error('Для перемещаемого чата необходимо наличие jquery ui draggable');
				}
			}

			if(!settings.useUserList)
			{
				$(settings.leftPanelSelector).hide();
			}

			$(settings.titleSelector).html(settings.title);

			//стилизуем скроллы в контейнерах
			[
				{selector: settings.tabsWrapperSelector, axis: 'x'},
				{selector: settings.onlineWrapperSelector, axis: 'xy'},
				{selector: settings.offlineWrapperSelector, axis: 'xy'}
			].forEach(methods.applyStyleToScroll);

		},
		/**
		 * Инициализация основной закладки
		 * @returns void
		 */
		initTab: function() {
			//создаём таб главного окна
			settings.container.find(settings.tabForCopySelector).click(methods.changeTab);
			if(settings.groupName)
			{
				methods.addTab.call(settings.container, settings.groupName, true, true);
			}

			//если передан список пользователей то создаём вкладки чатов для них
			if((typeof settings.openWithUser) === 'object'
					&& settings.openWithUser.length)
			{
				settings.openWithUser.forEach(function (user) {
					methods.addTab.call(settings.container, user, false);
				});

			}
		},
		/**
		 * Регистрация пользователя в сервисе
		 * @returns {void}
		 */
		registerUser: function() {
			$.post(settings.serverSideUrl, {
				user_id: settings.userId,
				group_id: ((settings.groupName) ? [settings.groupName] : null),
				action: 'register_user'
			}, function (data) {
				data = JSON.parse(data);
				//если всё хорошо иницализируем подключение к сервису
				if (!data.error)
				{
					HAWK_API.init({
						user_id: settings.userId,
						url: settings.serverUrl
					});
				}
			});
		},
		/**
		 * Обработчик входящего сообщения
		 * @param {Event} e объект события
		 * @param {Object} msg сообщение от сервиса
		 * @returns {void}
		 */
		onMessage: function (e, msg) {
			//так как при отправке сообщений в группу они рассылаются всем пользователям,
			//игнорируем сообщения адресованные самому себе, а также любые сообщения
			//кроме сгенерированных чатом
			if(msg.from === settings.userId || msg.event != 'hawk.chat_message')
			{
				return;
			}

			var panel = msg.to_group || msg.from;
			var $body = $('[data-hawk-panel_id="' + panel + '_panel"]');

			//создаём панель если нужно
			if(!$body.size())
			{
				settings.container.hawkChat('addTab', panel);
				$body = $('[data-hawk-panel_id="' + panel + '_panel"]');

				if(!msg.to_group && settings.onNewPrivate === 'function')
				{
					settings.onNewPrivate.call(settings.container, msg.from);
				}
			}

			//если в текущий момент панель не активна прибавляем счётчик ноывх сообщений
			if(!$body.is(':visible'))
			{
				var id = $body.data().hawkPanel_id;
				var tab_c = settings
					.container
					.find(
						settings.containertabSelector
						+ '[data-href="' + id + '"] '
						+ settings.countNewMessageSelector
					);

				var count = 0 | tab_c.text().replace('+', '');

				tab_c.text('+' + ++count);
			}

			//собираем строку для вставки в чат
			var str = methods.compileMessageString(msg);

			//если есть callback вызываем его
			if(typeof settings.onInMessage === 'function')
			{
				str = settings.onInMessage.call(settings.container, msg, str);
				//если вернулось -1 значит нужно пересобрать строку по новым данным
				if(str === -1)
				{
					str = methods.compileMessageString(msg);
				}
			}

			if(!msg.to_group && settings.onPrivateMessage === 'function')
			{
				str = settings.onPrivateMessage.call(settings.container, msg, str);
			}

			//если строка есть, то добавляем её в панель
			if(str !== false)
			{
				//@todo надо бы поменять плагин стилизации скроллов,
				//чтобы убрать этот костыль
				if($body.find('.mCSB_container').size())
				{
					$body = $body.find('.mCSB_container');
				}

				$body.append(str);

				if(typeof settings.container.mCustomScrollbar !== 'undefined')
				{
					//пролистываем к сообщению
					$body.parent().parent().mCustomScrollbar("scrollTo", 'bottom');
				}
			}
		},
		/**
		 * Собирает строку по шаблону
		 * @param {Object} msg сообщение от сервиса
		 * @returns {settings.inMessageFormat|msg.text}
		 */
		compileMessageString: function(msg) {
			//выбираем переменные из шаблона строки
			var vars = settings.inMessageFormat.match(/\{[\w]+\}/g);
			if(vars === null)
			{
				throw 'Invalid message format';
			}

			var str = settings.inMessageFormat;
			//собираем строку
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

			return str;
		},
		/**
		 * Callback после инициализации
		 * @returns {void}
		 */
		onInit: function() {
			if(typeof settings.onInit === 'function')
			{
				settings.onInit.call(settings.container);
			}
			//делаем запрос за списком групп пользователя
			HAWK_API.get_groups_by_user();

			//ставим интервал для обновления групп
			setInterval(function () {
				HAWK_API.get_groups_by_user();
			}, 30000);

			//до инициализации подключения ничего вводить нельзя
			$(settings.textInputSelector, settings.container).removeAttr('disabled');

			//инициализируем обработчики создания новой группы
			methods.addGroup();
		},
		/**
		 * Отображение списка пользователей
		 * @param {Event} e объект события
		 * @param {Object} msg сообщение от сервиса
		 * @returns {void}
		 */
		showUsers: function(e, msg) {
			if (msg.result && typeof msg.result === 'object')
			{
				HAWK_API.print_debug(msg);
				//удаляем старых пользователей
				$(settings.onlineWrapperSelector + ' '
						+ settings.usersContainerSelector  + ','
						+ settings.offlineWrapperSelector + ' '
						+ settings.usersContainerSelector
					).empty();

				if(typeof settings.onUserUpdate === 'function')
				{
					settings.onUserUpdate.call(settings.container, msg.result);
				}

				//пользователи приходят в формате название_группы =>[пользователи]
				users.online = [];
				users.offline = [];
				msg.result.forEach(function (record) {
					for(var gname in record)
					{
						record[gname].users.forEach(function (user) {
							var container = settings.onlineWrapperSelector + ' ' + settings.usersContainerSelector;

							var u_class = settings.onlineUserClass;
							if (!user.online && user.user != HAWK_API.get_user_id())
							{
								container = settings.offlineWrapperSelector + ' ' + settings.usersContainerSelector;
								u_class = settings.offlineUserClass;
							}
							else if(user.user === HAWK_API.get_user_id())
							{
								u_class = settings.currentUserClass;
							}

							container = $(container);

							//если такого пользователя нет в чате, то собираем строку пользовтаеля
							//проверка необходима так как один и тот же пользователь может находится
							//одновременно в нескольких группах
							if(!container.find('[data-hawk-id="' + user.user + '"]').size())
							{
								var html = settings
										.userFormat
										.replace(/\{login\}|\{id\}/g, user.user)
								;
								html = $(html);

								html.addClass(u_class);

								if(user.online && settings.useTabs)
								{
									html.click(methods.createPrivate);
								}

								container.append(html);
							}

							if(user.online)
							{
								users.online.push(user.user);
							}
							else
							{
								users.offline.push(user.user);
							}
						});
					}
				});
			}
		},
		/**
		 * Отображение списка групп
		 * @param {Event} e объект события
		 * @param {Object} msg сообщение от сервиса
		 * @returns {void}
		 */
		showGroups: function(e, msg) {
			$(settings.groupsWrapperSelector + ' ' + settings.usersContainerSelector).empty();
			var groups = [];
			//показываем список групп пользователя
			msg.result.forEach(function (group) {
				var container = settings.groupsWrapperSelector + ' ' + settings.usersContainerSelector;

				//собираем строку группы
				var html = settings
						.groupFormat
						.replace(/\{login\}|\{id\}/g, group.name)
				html = $(html);

				html.not('img').click(function (e) {
					methods.addTab.call(settings.container, group.name, true);
				});

				html.find(settings.exitGroupButtonSelector).click(methods.exitFromGroup)

				$(container).append(html);

				groups.push(group.name);
			});

			//отправляем запрос за пользователями в полученных группах
			HAWK_API.get_users_by_group(groups);
		},
		/**
		 * Выход пользователя из группы
		 * @param {Event} e объект события
		 * @returns {void}
		 */
		exitFromGroup: function (e) {
			e.stopPropagation();

			var group = $(this).data().hawkId;
			if(group)
			{
				//удаляем пользователя из группы
				//после этого сработает обработчик на событие удаленя пользователя
				//который обновит список групп
				HAWK_API.remove_user_from_group([group]);
			}
		},
		/**
		 * Создание новой группы
		 * @returns {void}
		 */
		addGroup: function() {
			$(settings.createGroupButtonSelector).click(function () {
				//показываем кнопки работы с группой и checkbox`ы в списке пользователей
				$(settings.onlineWrapperSelector + ' '
						+ settings.usersContainerSelector + ' '
						+ settings.userToGroupAddSelector
					).show();
				$(settings.createGroupButtonSelector).hide();
				$(settings.groupActionsWrapperSelector).show();
			});

			$(settings.groupActionsWrapperSelector + ' ' + settings.addGroupButtonSelector).click(function () {
				var users = $(settings.onlineWrapperSelector + ' '
						+ settings.usersContainerSelector + ' '
						+ settings.userToGroupAddSelector + ':checked'
					);
				if(!users.size())
				{
					alert('Для создания группы необходимо выбрать пользователей');
				}
				else
				{
					var gname = prompt("Придумайте название группы \r\n(допускаются символы латинского алфавита и \"_\"):");
					if(gname && gname.trim() !== '' && HAWK_API.check_user_id(gname))
					{
						//добавляем самого пользователя в группу
						HAWK_API.add_user_to_group([gname]);
						//добавляем остальных
						users.each(function () {
							HAWK_API.add_user_to_group([gname], this.value);
						});
					}

					//@todo плохой способ обновлять список групп по времени
					//нужно сделать подсчёт количества добавленных пользователей
					//и повесить callback на добавление пользователя
					//после добавления всех обновлять список групп
					setTimeout(function () {
						HAWK_API.get_groups_by_user();
					}, 1000)

					$(settings.createGroupButtonSelector).show();
					//прячем кнопки работы с группами
					$(settings.groupActionsWrapperSelector).hide();
					$(settings.onlineWrapperSelector + ' '
							+ settings.usersContainerSelector + ' '
							+ settings.userToGroupAddSelector
						).hide();
				}
			});

			$(settings.groupActionsWrapperSelector + ' ' + settings.exitGroupButtonSelector).click(function () {
				//прячем кнопки работы с группами
				$(settings.onlineWrapperSelector + ' '
						+ settings.usersContainerSelector + ' '
						+ settings.userToGroupAddSelector
					).hide();
				$(settings.createGroupButtonSelector).show();
				$(settings.groupActionsWrapperSelector).hide();
			});
		},
		/**
		* Возвращает список пользователей
		* @returns {Object}
		*/
		getUsers: function() {
			return users;
		},
		/**
		 * Отправка сообщения
		 * @param {Event} e объект события
		 * @returns {void}
		 */
		send: function (e) {
			//если нажат enter
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

				//формируем строку для вставки в чат
				//@todo доработать, чтобы было как при входящем сообщении
				//сделать callback
				var str = settings
						.outMessageFormat
						.replace('{time}', time)
						.replace('{from_login}', settings.userId.substr(0, 10))
						.replace('{message}', $this.val())
				;

				var $str = $(str);
				$str.addClass('chat-message-curent-user');

				var $body = settings.container.find(settings.messagePanelSelector + '.active');

				//@todo надо бы поменять плагин стилизации,
				//чтобы убрать этот костыль
				if($body.find('.mCSB_container').size())
				{
					$body = $body.find('.mCSB_container');
				}

				$body.append(str);

				if(typeof settings.container.mCustomScrollbar !== 'undefined')
				{
					$body.parent().parent().mCustomScrollbar("scrollTo", 'bottom');
				}

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

				//формируем сообщение для пользователя
				var msg = {
					to: to,
					text: {
						time: time,
						from_login: settings.userId,
						message: $this.val()
					},
					event: 'hawk.chat_message'
				};

				//вызываем callback перед отправкой сообщения
				if(typeof settings.onOutMessage === 'function')
				{
					settings.onOutMessage.call(settings.container, msg);
				}

				HAWK_API.send_message(msg);
				$this.val('');
			}
		},
		/**
		 * Создание приватной вкладки
		 * @param {Event} e объект события
		 * @returns {void}
		 */
		createPrivate: function (e) {
			var id = $(this).data().hawkId;
			if(!id || e.target.nodeName === 'INPUT' || e.target.nodeName === 'IMG')
			{
				e.stopPropagation();
			}
			else if(id != settings.userId)
			{
				settings.container.hawkChat('addTab', id);
			}
		},
		/**
		 * Создаёт новый таб
		 * @param {String} id ид группы или пользователя
		 * @param {Boolean} isGroup вкладка
		 * является группой или приватным чатом
		 * @returns {void}
		 */
		addTab: function(id, isGroup, isMain) {
			var container = settings.container;
			var tabs = container.find(settings.tabsContainerSelector);
			isGroup = isGroup || false;
			isMain = isMain || false;

			//проверяем наличие вкладки, если она уже есть,
			//то просто активируем её
			var tab = tabs.find('[data-href="' + id + '_panel' + '"]');
			if(tab.size())
			{
				tab.click();
				return ;
			}

			//находим шаблон таба, который будем копировать
			tab = tabs.find(settings.tabForCopySelector).clone(true);
			tab
				.removeClass('main')
				.addClass('active')
				.attr('data-href', id + '_panel')
				.attr('data-isMain', isMain)
				.attr('title', id)
				.attr('data-is-group', isGroup)
				.css('display', 'block')
				.find(settings.tabNameSelector)
				.html(id.substr(0, 10))
			;

			tabs
				.find(settings.tabSelector)
				.removeClass('active');

			tabs.find(settings.tabForCopySelector).parent().append(tab);

			container.find(settings.messagePanelSelector).removeClass('active').hide();
			//копируем панель сообщений
			var panel = container.find('[data-hawk-panel_id="chat_main_panel"]').clone(true);
			panel
				.attr('data-hawk-panel_id', id + '_panel')
				.addClass('active')
				.show()
			;

			//добавляем её в дерево и стилизуем скроллы
			container.find(settings.textPanelSelector).before(panel);
			methods.applyStyleToScroll({selector: panel, axis: 'y'});

			//вешаем обработчик закрытия вкладки
			tab.find(settings.closeTabSelector).click(methods.closeTab);
			$(settings.textInputSelector).show();
		},
		/**
		 * Переключает табы
		 * @returns {void}
		 */
		changeTab: function() {
			var $this =  $(this);
			var href = $this.data().href;
			var body = $this.parents(settings.bodySelector);
			var old = body.find(settings.tabSelector + '.active');

			body.find(settings.messagePanelSelector).removeClass('active').hide();
			body.find('[data-hawk-panel_id="' + href + '"]').addClass('active').show();

			body.find(settings.tabSelector).removeClass('active');
			$this.addClass('active');
			$this.find(settings.countNewMessageSelector).empty();

			if(settings.onChangeTab === 'function')
			{
				settings.onChangeTab.call(settings.container, old, $this);
			}
		},
		/**
		 * Закрывает таб
		 * @returns {void}
		 */
		closeTab: function() {
			var $this = $(this);
			var tab = $this.parent();

			$('[data-hawk-panel_id="' + tab.data().href + '"]').remove();
			tab.remove();
			$(settings.tabsContainerSelector, settings.container)
					.find(settings.tabSelector + ':last')
					.not(settings.tabForCopySelector)
					.click();

			if(!settings.container.find(settings.messagePanelSelector + ':visible').size())
			{
				$(settings.textInputSelector).hide();
			}

		},
		/**
		 * Выбирает функцию стилизации скроллов и применяет ее
		 * к переданному элемнту
		 * @param {String} element селектор
		 * @returns {void}
		 */
		applyStyleToScroll: function (element) {
			var stScroll = null;
			if(!settings.customScroll)
			{
				stScroll = methods.stylizationScroll;
			}
			else if(typeof settings.customScroll === 'function')
			{
				stScroll = settings.customScroll;
			}

			if(stScroll)
			{
				stScroll(element);
			}
		},
		/**
		 * Стилизация скроллов по-умолчанию.
		 * Используется плагин mCustomScrollbar
		 * http://manos.malihu.gr/jquery-custom-content-scroller/
		 * @param {String} element селектор
		 * @returns {void}
		 */
		stylizationScroll: function(element) {
			if(typeof settings.container.mCustomScrollbar !== 'undefined')
			{
				var context = settings.container;
				$(element.selector, context).mCustomScrollbar({
					axis: element.axis,
					scrollButtons:{
						enable: true
					},
					theme:"dark-thin",
					scrollInertia: 200,
					autoHideScrollbar: true,
					autoExpandScrollbar: true,
					advanced:{
						autoExpandHorizontalScroll: true
					}
				});
			}
		},
		/**
		 * Дефолтный html-код чата
		 * @returns {String}
		 */
		getDefaultHtml: function(){
			return '<div class="chat-container"> \
				<div id="" class="chat-header"> \
					<div class="chat-title">Post Hawk Chat</div> \
					<div class="chat-logo"></div> \
				</div> \
				<div class="chat-body"> \
					<div class="chat-left-panel"> \
						<div class="chat-separator">\
							<span>Группы</span>\
							<span id="create_new_group">\
								<div class="add-hawk-group"></div> \
							</span>\
							<span id="actions_new_group">\
								<div class="add-hawk-group-confirm"></div> \
								<div class="add-hawk-group-dismiss"></div> \
							</span>\
						</div> \
						<div class="chat-groups-u" id="chat_groups_u"><table class="chat-users"></table></div> \
						<div class="chat-separator"><span>В сети</span></div> \
						<div class="chat-online-u" id="chat_online_u"><table class="chat-users"></table></div> \
						<div class="chat-separator"><span>Не в сети</span></div> \
						<div class="chat-offline-u" id="chat_offline_u"><table class="chat-users"></table></div> \
					</div> \
					<div class="chat-right-panel"> \
						<div class="chat-tabs">\
							<ul>\
								<li style="display: none;" data-href="chat_main_panel" class="chat-tab main">\
									<span class="chat-tab-name"></span>\
									<span class="chat-tab-count-new"></span>\
									<span class="chat-close-tab">x</span>\
								</li>\
							</ul> \
						</div>\
						<div style="display: none;" data-hawk-panel_id="chat_main_panel" class="chat-mesasge-panel"></div> \
						<div class="chat-text-panel"> \
							<input disabled="disabled" id="chat_send_message" placeholder="Введите сообщение" class="chat-text-input" type="text"> \
						</div> \
					</div> \
				</div> \
			</div>';
		},
		/**
		 * Дефолтный формат сообщения
		 * @returns {String}
		 */
		getDefaultInMessageFormat: function () {
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
			return '<tr data-hawk-id="{id}">\
						<td><input value="{login}" class="hawk-new-users-group" style="display: none;" type="checkbox" class="add_to_hawk_group"></td>\
						<td>{login}</td>\
					</tr>';
		},
		/**
		 * Дефолтный формат отображения групп
		 * @returns {String}
		 */
		getDefaultGroupFormat: function () {
			return '<tr data-hawk-id="{id}"><td>{login}</td><td><div data-hawk-id="{id}" class="add-hawk-group-dismiss"></div></td></tr>';
		},
		/**
		 * Устанавливает заголовок главного таба
		 * @param {String} name заголовок
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
		chatBody: methods.getDefaultHtml(),
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
		 * @param string inMessageFormat формать строки
		 * для отображения входящего сообщений в чате
		 */
		inMessageFormat: methods.getDefaultInMessageFormat(),
		/**
		 * @param string outMessageFormat формать строки
		 * для отображения исходящего сообщений в чате
		 */
		outMessageFormat: methods.getDefaultInMessageFormat(),
		/**
		 * @param string userFormat формать строки
		 * для отображения пользователей в списке
		 */
		userFormat: methods.getDefaultUserFormat(),
		/**
		 * @param string groupFormat формать строки
		 * для отображения группы в списке
		 */
		groupFormat: methods.getDefaultGroupFormat(),
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
		 * @param string currentUserClass класс,
		 * который будет присвоен текущему пользователю
		 */
		currentUserClass: 'chat-current',
		/**
		 * @param string tabForCopySelector селектор
		 * для выборки шаблона таба
		 */
		tabForCopySelector: '.chat-tab.main',
		/**
		 * @param string tabsContainerSelector селектор
		 * для выборки контейнера табов
		 */
		tabsContainerSelector: '.chat-tabs ul',
		/**
		 * @param string tabsWrapperSelector селектор
		 * для выборки обёртки контейнера табов
		 */
		tabsWrapperSelector: '.chat-tabs',
		/**
		 * @param string tabSelector селектор
		 * для выборки одного таба
		 */
		tabSelector: '.chat-tab',
		/**
		 * @param string tabNameSelector селектор
		 * для выборки контейнера имени таба
		 */
		tabNameSelector: '.chat-tab-name',
		/**
		 * @param string messagePanelSelector селектор
		 * для выборки контейнера сообщений чата
		 */
		messagePanelSelector: '.chat-mesasge-panel',
		/**
		 * @param string textPanelSelector селектор
		 * для выборки контйнера с текстом для отправки
		 */
		textPanelSelector: '.chat-text-panel',
		/**
		 * @param string bodySelector селектор
		 * для выборки основного контейнера чата
		 */
		bodySelector: '.chat-body',
		/**
		 * @param string countNewMessageSelector селектор
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
		 * @param boolean useUserList показывать или нет список пользователей
		 */
		useUserList: true,
		/**
		 * @param string leftPanelSelector селектор
		 * для выборки контейнера со списком пользователей
		 */
		leftPanelSelector: '.chat-left-panel',
		/**
		 * @param string title заголовок чата
		 */
		title: 'Post Hawk Chat',
		/**
		 * @param string titleSelector селектор
		 * для выборки заголовка чата
		 */
		titleSelector: '.chat-title',
		/**
		 * @param Array openWithUser
		 * после загрузки создать чат с пользователем
		 */
		openWithUser: [],
		/**
		 * @param string closeTabSelector селектор
		 * для выборки кнопки закрытия таба
		 */
		closeTabSelector: '.chat-close-tab',
		/**
		 * @param string textInputSelector селектор
		 * для выборки местонахождения текста
		 */
		textInputSelector: '#chat_send_message',
		/**
		 * @param string onlineWrapperSelector селектор
		 * для выборки обёртки контейнера онлайн пользователей
		 */
		onlineWrapperSelector: '#chat_online_u',
		/**
		 * @param string groupsWrapperSelector селектор
		 * для выборки обёртки контейнера групп пользователя
		 */
		groupsWrapperSelector: '#chat_groups_u',
		/**
		 * @param string offlineWrapperSelector селектор
		 * для выборки обёртки контейнера оффлайн пользователей
		 */
		offlineWrapperSelector: '#chat_offline_u',
		/**
		 * @param string usersContainerSelector селектор
		 * для выборки контейнера с пользователями
		 */
		usersContainerSelector: 'table.chat-users',
		/**
		 * @param string exitGroupButtonSelector селектор
		 * для выборки кнопки прекращения создания группы
		 */
		exitGroupButtonSelector: '.add-hawk-group-dismiss',
		/**
		 * @param string addGroupButtonSelector селектор
		 * для выборки кнопки подтверждения создания в группы
		 */
		addGroupButtonSelector: '.add-hawk-group-confirm',
		/**
		 * @param string userToGroupAddSelector селектор
		 * для выборки пользователей для создания новой группы
		 */
		userToGroupAddSelector: '.hawk-new-users-group',
		/**
		 * @param string createGroupButtonSelector селектор
		 * для выборки кнопки перехода в режим создания группы
		 */
		createGroupButtonSelector: '#create_new_group',
		/**
		 * @param string createGroupButtonSelector селектор
		 * для выборки контейнера с кнопками
		 * создания/отказа от создания группы
		 */
		groupActionsWrapperSelector: '#actions_new_group',
		/**
		 * callback, вызываемый после инициализиции плагина
		 */
		onInit: function () {},
		/**
		 * callback, вызываемый при входящем сообщении
		 * в нём можно модифицировать строку,
		 * которую увидит пользователь.
		 * Если функция вернёт -1, то новая строка будет
		 * скомпилирована на основе изменённых свойст объекта
		 * сообщения.
		 *
		 * @param object msg объект сообщения
		 * @param string str сформированная строка
		 * @returns string|-1
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
		onChangeTab: function (old_tab, new_tab) {},
		/**
		 * Функция для стилизации scrollbar
		 * если этот параметр установлен встроенная функци вызвана не будет
		 */
		customScroll: false
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