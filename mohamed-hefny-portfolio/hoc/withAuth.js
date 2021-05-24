import { useUser } from '@auth0/nextjs-auth0';
import Redirect from '@/components/shared/redirect'
import { isAuthorized } from '../utils/auth0';

const withAuth = (Component) => {
    return (role) => {
        return (props) => {
            const { user, isLoading } = useUser();
            if (isLoading) {
                return <p>Loading...</p>
            }

            if (!user) {
                return <Redirect ssr to="/api/auth/login" />
            } else {
                if (role && !isAuthorized(user,role)) {
                    return <Redirect ssr to="/api/auth/login" />
                }
                return <Component user={user} isLoading={isLoading} {...props} />
            }
        }
    }
}

export default withAuth;
