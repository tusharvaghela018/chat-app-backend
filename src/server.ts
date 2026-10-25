import App from "@/app";
import AuthRoute from "@/Routes/auth.route";
import MessageRoute from "@/Routes/message.route";
import UserRoute from "@/Routes/user.route";
import GroupRoute from "@/Routes/group.route";
import IndexRoute from "@/Routes/index.route";
import ConversationRoute from "@/Routes/conversation.route";
import UploadRoute from "@/Routes/upload.route";
import StarredMessageRoute from "@/Routes/starred-message.route";
import CallRoute from "@/Routes/call.route";

const appServer = new App([
    new IndexRoute(),
    new AuthRoute(),
    new UserRoute(),
    new MessageRoute(),
    new GroupRoute(),
    new ConversationRoute(),
    new UploadRoute(),
    new StarredMessageRoute(),
    new CallRoute(),
]);

appServer.listen();

export default appServer;
