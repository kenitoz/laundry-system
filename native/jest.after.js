// Router screens mount slowly when all suites run in parallel; the default 1 s wait flakes.
require('@testing-library/react-native').configure({ asyncUtilTimeout: 5000 });
