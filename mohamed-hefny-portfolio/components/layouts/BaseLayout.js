import Header from '@/components/shared/Header';
import { ToastContainer } from 'react-toastify';

const BaseLayout = props => {
  const { className, user, isLoading, navClass= "with-bg", children } = props;
  return (
    <div className="layout-container" >
      <Header user={user} 
      isLoading={isLoading}
      className = {navClass}/>
      <main className={`cover ${className}`}>
        <div className="wrapper">
          {children}
        </div>
      </main>
      <ToastContainer/>
    </div>
  )
}

export default BaseLayout;