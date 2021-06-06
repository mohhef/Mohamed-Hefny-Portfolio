import { useUser } from '@auth0/nextjs-auth0';
import Redirect from '@/components/shared/Redirect'
import { isAuthorized } from '../utils/auth0';
import { toast } from 'react-toastify';

const withAuth = (Component) => {
    return (role) => {
        return (props) => {
            const { user, isLoading } = useUser();
            if (isLoading) {
                return <p>Loading...</p>
            }

            if (!user) {
                toast.error("Make sure you are logged in!", { autoClose: 2000 })
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
