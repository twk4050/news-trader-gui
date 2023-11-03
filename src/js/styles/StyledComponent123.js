import { styled } from '@mui/material/styles';
import { Button } from '@mui/material';

const Colors123 = {
    // https://m2.material.io/design/color/the-color-system.html#tools-for-picking-colors
    ButtonBackGround: '#424242', // Gray 800
    ButtonBorder: '#9E9E9E', // Gray 500
    ButtonHoverBackGroundColor: '#BDBDBD', // Gray 400

    SelectedButtonBackGround: '#558B2F', // Light Green 800
    // TvBackground : '#141823'

    green1: '#66BB6A',
    green2: '#4CAF50',
    green3: '#43A047',
    green4: '#388E3C',
    green5: '#2E7D32',
    green6: '#1B5E20',

    lg1: '#9CCC65',
    lg2: '#8BC34A',
    lg3: '#7CB342',
    lg4: '#689F38',

    red1: '#E57373',
    red2: '#EF5350',
    red3: '#F44336',
    red4: '#E53935',
    red5: '#D32F2f',
    red6: '#C62828',
    red7: '#B71C1C',

    r: '#D50000',
};

const IntervalButtonBase = styled(Button)(({ theme }) => ({
    minWidth: '36px',
    maxWidth: '36px',
    minHeight: '24px',
    maxHeight: '24px',

    borderRadius: '8px',
    fontSize: '12px',

    color: 'white',
    border: `2px solid ${Colors123.ButtonBorder}`,
}));

const IntervalButton = styled(IntervalButtonBase)(({ theme }) => ({
    backgroundColor: Colors123.ButtonBackGround,

    '&:hover': { backgroundColor: Colors123.ButtonHoverBackGroundColor },
}));

const SelectedIntervalButton = styled(IntervalButtonBase)(() => ({
    backgroundColor: Colors123.SelectedButtonBackGround,
    '&:hover': { backgroundColor: Colors123.SelectedButtonBackGround },
}));

const OrderButtonBase = styled(Button)(() => ({
    minWidth: '48px',
    maxWidth: '48px',
    minHeight: '28px',
    maxHeight: '28px',

    color: 'white',
}));

const BuyButton = styled(OrderButtonBase)(() => ({
    backgroundColor: Colors123.green5,
    '&:hover': { backgroundColor: Colors123.green2 },
}));

const SellButton = styled(OrderButtonBase)(() => ({
    backgroundColor: Colors123.red7,
    '&:hover': { backgroundColor: Colors123.red4 },
}));

export { IntervalButton, SelectedIntervalButton, BuyButton, SellButton };
