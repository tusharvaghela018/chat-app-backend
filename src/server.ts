import App from "@/app";
import AuthRoute from "@/Routes/auth.route";
import MessageRoute from "@/Routes/message.route";
import UserRoute from "@/Routes/user.route";
import GroupRoute from "@/Routes/group.route";
import IndexRoute from "@/Routes/index.route";
import ConversationRoute from "@/Routes/conversation.route";

const appServer = new App([
    new IndexRoute(),
    new AuthRoute(),
    new UserRoute(),
    new MessageRoute(),
    new GroupRoute(),
    new ConversationRoute()
]);

appServer.listen();

export default appServer;
