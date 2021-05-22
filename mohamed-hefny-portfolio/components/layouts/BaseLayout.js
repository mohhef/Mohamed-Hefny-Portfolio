import Header from '@/components/shared/Header';

const BaseLayout = props => {
  const { className, user, isLoading, children } = props;
  return (
    <div className="layout-container">
      <Header user={user} isLoading={isLoading}/>
      <main className={`cover ${className}`}>
        <div className="wrapper">
          {children}
        </div>
      </main>
    </div>
  )
}

export default BaseLayout;