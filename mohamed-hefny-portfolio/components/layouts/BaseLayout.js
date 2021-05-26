import Header from '@/components/shared/Header';

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
    </div>
  )
}

export default BaseLayout;