import { useState, useEffect } from 'react';
import {
  createBrowserRouter,
  Link,
  Route,
  RouterProvider,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faList,
  faUser,
  faBox,
  faFile,
  faKey,
  faChevronUp,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import logo from './assets/LogoNew.png';
import Quotations from './components/Quotations';
import Mainpage from './components/Mainpage';
import NewQuotation from './components/NewQuotation';
import CustomerForm from './components/CreateCustomer';
import SalesForm from './components/SalesPerson';
import View from './components/View';
import LoginForm from './components/Login';
import Test from './components/test';
import Items from './components/Items';
//import Reports from './components/Reports';
import CustomerReport from './components/CustomerReport';
import QuotationReport from './components/QuotationReport';
import ChangePassword from './components/ChangePassword';
import Dashboard from './components/Dashboard';

const router = createBrowserRouter([{ path: '*', Component: Root }]);

export default function App() {
  return <RouterProvider router={router} />;
}

function Root() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [reportsOpen, setReportsOpen] = useState(false);

  useEffect(() => {
    // Check for user data in localStorage first (Remember Me enabled)
    const rememberedUser = localStorage.getItem('user');
    const sessionUser = sessionStorage.getItem('user');
    //console.log(rememberedUser);
    //console.log(sessionUser);

    if (rememberedUser) {
      setIsLoggedIn(true);
      setUserData(JSON.parse(rememberedUser));
    } else if (sessionUser) {
      setIsLoggedIn(true);
      setUserData(JSON.parse(sessionUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user, rememberMe) => {
    setIsLoggedIn(true);
    setUserData(user);

    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.removeItem('user'); // Avoid conflicts
    } else {
      sessionStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('user'); // Avoid conflicts
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    sessionStorage.removeItem('user');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (isLoading) {
    return <div></div>;
  }

  if (!isLoggedIn) {
    return (
      <LoginForm
        onLogin={(user, rememberMe) => handleLogin(user, rememberMe)}
      />
    );
  }

  return (
    <div className='flex h-screen'>
      {/* Fixed Sidebar */}
      <div className='w-1/6 px-4 bg-green-950 flex flex-col h-full'>
        <Link to='/'>
          {' '}
          <img
            src={logo}
            alt='Company Logo'
            className='w-16 md:w-32 lg:w-48 mt-2'
            style={{ maxWidth: '150px' }}
          />
        </Link>
        <div className='my-2'>
          <Link
            to='/'
            className=' block w-full text-left px-4 py-2 my-4 bg-green-950 text-white rounded-none hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
          >
            <FontAwesomeIcon icon={faHome} className='mr-2' />
            <span className='hidden md:inline'>Dashboard</span>
          </Link>
          <Link
            to='/quotations'
            className='block w-full text-left px-4 py-2 my-4 bg-green-950 text-white rounded-none hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
          >
            <FontAwesomeIcon icon={faList} className='mr-2' />
            <span className='hidden md:inline'>Quotations</span>
          </Link>
          <Link
            to='/customerform'
            className='block w-full text-left px-4 py-2 my-4 bg-green-950 text-white rounded-none hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
          >
            <FontAwesomeIcon icon={faUser} className='mr-2' />
            <span className='hidden md:inline'>Customer</span>
          </Link>
          <Link
            to='/salesform'
            className='block w-full text-left px-4 py-2 my-4 bg-green-950 text-white rounded-none hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
          >
            <FontAwesomeIcon icon={faUser} className='mr-2' />
            <span className='hidden md:inline'>Sales Person</span>
          </Link>
          <Link
            to='/items'
            className='block w-full text-left px-4 py-2 my-4 bg-green-950 text-white rounded-none hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
          >
            <FontAwesomeIcon icon={faBox} className='mr-2' />
            <span className='hidden md:inline'>Items</span>
          </Link>
          {/* {userData.sales_p_type === 'A' ? ( */}
          <div className='relative'>
            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className='block w-full text-left px-4 py-2 my-4 bg-green-950 text-white rounded-none hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
            >
              <FontAwesomeIcon icon={faFile} className='mr-2' />
              <span className='hidden md:inline'>Reports</span>
              <FontAwesomeIcon
                icon={reportsOpen ? faChevronUp : faChevronDown}
                className='ml-2'
              />
            </button>
            {reportsOpen && (
              <div className='ml-6 bg-green-950'>
                <Link
                  to='/customerreport'
                  className='block text-left px-4 py-2 my-2 text-white hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
                >
                  Customer Reports
                </Link>
                <Link
                  to='quotationreport'
                  className='block text-left px-4 py-2 my-2 text-white hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
                >
                  Quotation Reports
                </Link>
              </div>
            )}
          </div>
          {/* ):null} */}
          <Link
            to='/changepassword'
            className='block w-full text-left px-4 py-2 my-4 bg-green-950 text-white rounded-none hover:bg-slt hover:bg-cover hover:text-white hover:font-bold'
          >
            <FontAwesomeIcon icon={faKey} className='mr-2' />
            <span className='hidden md:inline'>Change Password</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Fixed Top Navbar */}
        <div className='bg-green-950 p-2 flex w-full justify-end'>
          <div className='flex items-end justify-end'>
            {/* <header className="text-xl font-semibold mb-0 text-white pl-4">
            E W Information System Ltd
          </header> */}
            <div className='flex items-center justify-end space-x-4'>
              <label className='text-base font-semibold mb-0 text-white '>
                Welcome, {userData.sales_p_name}
              </label>
              <button
                className='ml-4 bg-green-950 hover:bg-slt font-bold hover:text-white hover:font-bold rounded w-20 text-white'
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-y-auto '>
          <Routes>
            <Route path='/' element={<Mainpage user={userData} />} />
            <Route path='/quotations' element={<Quotations />} />
            <Route path='/quotations/create' element={<NewQuotation />} />
            <Route
              path='/customerform'
              element={<CustomerForm user={userData} />}
            />
            <Route path='/salesform' element={<SalesForm user={userData} />} />
            <Route path='/items' element={<Items user={userData} />} />
            <Route
              path='/quotations/view/:quotationId'
              element={<View user={userData} />}
            />
            <Route
              path='/customerreport'
              element={<CustomerReport user={userData} />}
            />
            <Route
              path='/quotationreport'
              element={<QuotationReport user={userData} />}
            />
            <Route
              path='/quotations/view/:quotationId'
              element={<View user={userData} />}
            />
            <Route
              path='/changepassword'
              element={<ChangePassword user={userData} />}
            />
            <Route path='/dashboard' element={<Dashboard user={userData} />} />
            {/* <Route path="/changepassword" element={<Items user={userData} />} /> */}
          </Routes>
        </div>
      </div>
    </div>
  );
}
