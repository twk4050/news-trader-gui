import React, { useContext, useEffect, useState, useRef } from 'react';
import {
    Box,
    Card,
    Button,
    CardActions,
    CardContent,
    Stack,
    Typography,
    List,
    Link,
    Checkbox,
    FormControlLabel,
} from '@mui/material';

import { BuyButton, SellButton } from './styles/StyledComponent123';
import { newsUtils, GLOBAL_API } from './utils';

// padding : {top right bottom left}
function NewsCard({ news }) {
    // { title, body, link, coins, time, SOURCE}
    const { title, body, link, coins, time } = news;

    const order_nv_size = ['0'];

    const coinsFound = coins.length !== 0;

    function handleOnClickBuyWrapper(e, symbol, nv) {
        function wrapper(symbol, nv) {
            console.log(symbol, nv);
        }

        return wrapper(symbol, nv);
    }

    function handleOnClickSellWrapper(e, symbol, nv) {
        function wrapper(symbol, nv) {
            console.log(symbol, nv);
        }

        return wrapper(symbol, nv);
    }

    return (
        <Box>
            <Card>
                <CardContent sx={{ padding: '2px 20px 4px 8px' }}>
                    {/* <Typography variant="h5" align="left"> */}
                    <Typography sx={{ fontSize: '20px' }}>{title}</Typography>
                </CardContent>

                <CardContent sx={{ padding: '0px 20px 8px 16px' }}>
                    <Typography variant="body2" align="left">
                        {body}
                    </Typography>
                </CardContent>
                {coinsFound ? (
                    coins.map((coin, i) => (
                        <CardActions key={i}>
                            {/* display symbol from news */}
                            <Button
                                variant="outlined"
                                sx={{ fontSize: '12px', minWidth: '100px', maxWidth: '100px' }}
                            >
                                {coin}
                            </Button>

                            {/* {order_nv_size.map((order_nv, i) => (
                                <BuyButton key={i}>{order_nv}</BuyButton>
                            ))}

                            {order_nv_size.map((order_nv, i) => (
                                <SellButton key={i}>{order_nv}</SellButton>
                            ))} */}
                        </CardActions>
                    ))
                ) : (
                    <CardActions>
                        <Typography
                            sx={{
                                fontSize: '12px',
                                color: 'gray',
                            }}
                        >
                            no symbols found
                        </Typography>
                    </CardActions>
                )}

                {/* display link + date time on bottom right */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        padding: '0px 10px 0px 0px',
                    }}
                >
                    <Link
                        href={link}
                        target="_blank"
                        underline="hover"
                        sx={{ padding: '0px 8px 0px 0px' }}
                    >
                        <Typography sx={{ fontSize: '14px' }}>LINK</Typography>
                    </Link>
                    <Typography sx={{ fontSize: '12px', color: 'gray' }}>{time}</Typography>
                </Box>
            </Card>
        </Box>
    );
}

export default function NewsContainer({ sxProps }) {
    const [newsFeed, setNewsFeed] = useState(newsUtils.generateMockNewsFeed);

    const [disableSound, setDisableSound] = useState(false);

    // NewsContainer re-render factors: 1. new incoming news `newsFeed` 2. sound change
    if (!disableSound) {
        console.log('playing sound');
        GLOBAL_API.notify.playSound();
    }

    function handleIncomingNews(incomingNews) {
        setNewsFeed((prevNews) => {
            // if new news, play sound from nodejs
            return [incomingNews, ...prevNews];
        });
    }

    function test123(e) {
        console.log(disableSound);
    }

    useEffect(() => {
        newsUtils.initTreeWS(handleIncomingNews);
    }, []);

    return (
        <Stack spacing={1} sx={{ maxHeight: '550px', overflow: 'auto', ...sxProps }}>
            <Stack direction={'row'} spacing={1}>
                <Typography
                    sx={{ width: '100px', maxHeight: '20px', fontSize: '14px', color: 'gray' }}
                >
                    News Feed
                </Typography>

                <FormControlLabel
                    control={<Checkbox onChange={(e) => setDisableSound(!disableSound)} />}
                    label="disable sound?"
                    sx={{ maxWidth: '200px', maxHeight: '20px' }}
                />
                <Button onClick={test123} sx={{ maxWidth: '20px', maxHeight: '20px' }}>
                    test123
                </Button>
            </Stack>

            {newsFeed.map((news, i) => (
                <NewsCard news={news} key={i} />
            ))}
        </Stack>
    );
}
