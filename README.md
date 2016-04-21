Post Hawk чат
==========
Чат основанный на сервисе [Post Hawk](https://github.com/postHawk)

Добавить чат Post Hawk на сайт очень просто. 
Для этого необходимо сделать несколько простых действий:
```bash
git clone https://github.com/postHawk/hawk_chat
```
Разместить у себя на сервере php файл с примерным содержимым:
```php
<?php
namespace hawk_api\analitics;
require_once __DIR__ . '/hawk_api/php/hawk_api.php';

use \hawk_api\hawk_api;

class Сhat extends hawk_api
{
    /**
     * Конструктор. Инициалзирует объект апи
     */
    public function __construct($key)
    {
        parent::__construct($key);
    }

    /**
     * Точка входа
     */
    public function main()
    {
        $action = (string)$_POST['action'];

		switch ($action)
		{
			case 'register_user':
				$this->add_user();
				break;
			default:
				throw new \Exception('Unknow action');
		}
    }

    /**
     * Регистрирует пользвателя в сервисе и
     * добавляет его в группу
     * @return Boolean
     */
    private function add_user()
    {
        if(!$_POST['user_id'])
        {
            return false;
        }

        $this->register_user($_POST['user_id']);
		if($_POST['group_id'] && count($_POST['group_id']))
		{
			$this->add_user_to_group($_POST['user_id'], $_POST['group_id']);
		}
            
        $res = $this
			->execute()
            ->get_results();

		if($this->has_errors())
		{
			throw new \Exception(print_r($this->get_errors(), 1));
		}

		$res = $res[0]['register_user'];

        echo json_encode($res);
    }
}

$chat = new Сhat('api_key');
$chat->main();
```
Подключить необходимые файлы на клиенте:
```html
<link rel="stylesheet" type="text/css" href="Hawk_chat/lib/jquery.mCustomScrollbar.min.css"/>
<link rel="stylesheet" type="text/css" href="Hawk_chat/src/hawk_chat.css"/>
<script type="text/javascript" src="hawk_api/js/jq.js"></script>
<script type="text/javascript" src="Hawk_chat/lib/jquery.mCustomScrollbar.concat.min.js"></script>
<script type="text/javascript" src="hawk_api/js/hawk_api.js"></script>
<script type="text/javascript" src="Hawk_chat/src/hawk_chat.js"></script>
```
Инициализировать плагин:
```html
<div id="chat"></div>
```
```javascript
$('#chat').hawkChat({
    userId: 'id', //id пользователя
    serverSideUrl: 'index.php' //адрес серверного скрипта
});
```
Настройки чата
```javascript
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
```
