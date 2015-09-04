Post Hawk чат
==========

Чат основанный на сервисе Post Hawk


Примеры:
==========

Простая инициализация:

```html
<link rel="stylesheet" type="text/css" href="/hawk/hawk_chat.css"/>
<script type="text/javascript" src="js/hawk_api.js"></script>
<script type="text/javascript" src="js/hawk_chat.js"></script>
<div id="chat"></div>
```

```javascript
$('#chat').hawkChat({
	userId: 'id', //id пользователя
	serverSideUrl: 'index.php' //адрес серверного скрипта
});
```

Возможные параметры объекта:

```javascript
{
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
		onInMessage: function (msg, str) { return str;},
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
		onPrivateMessage: function (msg, str) {return str;},
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
		onUserUpdate: function (list) {return list;},
		/**
		 * callback, вызываемый при смене вкладок
		 *
		 * @param object old_tab предыдущая вкладка
		 * @param object new_tab новая вкладка
		 */
		onChangeTab: function (old_tab, new_tab) {}
	}
});
```

Код простейшей серерной части

```php
<?php
require_once __DIR__ . 'hawk/hawk_api.php';

use \hawk_api\hawk_api;

class chat
{
	/**
	 *
	 * @var hawk_api объект api
	 */
	private $api = null;

	/**
	 * Конструктор. Инициалзирует объект апи
	 */
	public function __construct()
	{
		$this->api = new hawk_api('api_key');
	}

	/**
	 * Точка входа
	 */
	public function main()
	{
		$action = (string)$_POST['action'];

		if(method_exists($this, $action))
		{
			$this->$action();
		}
	}

	/**
	 * Регистрирует пользвателя в сервисе и
	 * добавляет его в группу
	 * @return Boolean
	 */
	private function register_user()
	{
		if(!$_POST['user_id'] || !$_POST['group_id'])
		{
			return false;
		}

		$res = $this->api
			->register_user($_POST['user_id'])
			->add_user_to_group($_POST['user_id'], $_POST['group_id'])
			->execute()
			->get_results()[0]['register_user'];

		echo json_encode($res);
	}
}

(new chat())->main();
```