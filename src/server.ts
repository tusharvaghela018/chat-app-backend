import App from "@/app";
import AuthRoute from "@/Routes/auth.route";
import MessageRoute from "@/Routes/message.route";
import UserRoute from "@/Routes/user.route";
import GroupRoute from "@/Routes/group.route";

const appServer = new App([new AuthRoute(), new UserRoute(), new MessageRoute(), new GroupRoute()]);

appServer.listen();

export default appServer;
