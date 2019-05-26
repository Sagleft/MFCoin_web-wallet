// -- transactions --
var txType = 'txBCI';

function txGetUnspent()
{
    var addr = rush.address;

    var url = 'http://satellite/utxo?addr=' + addr;

    //url = prompt('Press OK to download transaction history:', url);
    if (url != null && url != "")
    {
        rush.txUnspent = '';
		var amount = 0;
        //ajax(url, txParseUnspent);
		$.ajax({
			url: url,
			success: function(response) {
				//TODO: test json
				//console.log(response);
				var res = JSON.parse(response);
				res = res.reverse();
				out = '{ "unspent_outputs": [ ';
				count = 0;
				for (txindy in res) {
					if (count >= 1) { out = out + ', '; }
					txin = res[txindy];
					out = out + '{ "block_number": ' + '"notavailable"' + ', ';
					out = out + '"script": "' + txin["script"] + '", ';
					out = out + '"tx_hash": "' + txin["tx_hash"] + '", ';
					out = out + '"tx_output_n": ' + txin["tx_ouput_n"] + ', ';
					amount = txin["value"] / 100000000;
					out = out + '"value": ' + amount.toFixed(8) + ', ';
					out = out + '"value_hex": "' + (amount.toFixed(8)).toString(16) + '" }';
					count += 1;
				}
				out = out + " ] }";
				txParseUnspent(out);
				//txParseUnspent(res);
			},
			error: function (xhr, opt, err) {
				//
			}
		});
    } else {
        txSetUnspent(rush.txUnspent);
    }
}

function txSetUnspent(text)
{
    var r = JSON.parse(text);
    txUnspent = JSON.stringify(r, null, 4);
    rush.txUnspent = txUnspent;
    var address = rush.address;
    TX.parseInputs(txUnspent, address);
    var value = TX.getBalance();
    //var fval = value / 100000000;
    var fval = value;
    var fee = parseFloat(rush.txFee);
    rush.balance = fval;
    rush.txValue = fval - fee;
    txRebuild();
}

function txParseUnspent(text)
{
    if (text == '') {
		setMsg('No data');
	} else {
		txSetUnspent(text);
	}
}

function txOnAddDest()
{
    var list = $(document).find('.txCC');
    var clone = list.last().clone();
    clone.find('.help-inline').empty();
    clone.find('.control-label').text('Cc');
    var dest = clone.find('#txDest');
    var value = clone.find('#txValue');
    clone.insertAfter(list.last());
    onInput(dest, txOnChangeDest);
    onInput(value, txOnChangeDest);
    dest.val('');
    value.val('');
    $('#txRemoveDest').attr('disabled', false);
    return false;
}

function txOnRemoveDest()
{
    var list = $(document).find('.txCC');
    if (list.size() == 2)
        $('#txRemoveDest').attr('disabled', true);
    list.last().remove();
    return false;
}

function txSent(text)
{
    if (/error/.test(text))
    {
        if (rush.counter < 3)
        {
            //
        }
        else
        {
            rush.counter = 0;
            setMsg("There seems to be a problem with building the transaction. This in no way affects the safety of your Bitcoins.")

            rush.txSec = "";
        }
    }
    else
    {
        rush.txComplete();
    }
}

function txSend()
{
    var txAddr = rush.address;
    var address = TX.getAddress();

    var r = '';
    if (txAddr != address) {
		r += 'Warning! Source address does not match private key.\n\n';
	}

    var tx = rush.txHex;

	//url = 'https://block.mfcoin.net/api/tx/send';
	url = "http://satellite/sendtx";
	console.log(tx);
    postdata = 'rawtx=' + tx;
    if (url != null && url != "")
    {
        ajax(url, txSent, postdata);
    }
    return false;
}

function txRebuild()
{
    var sec = rush.txSec;
    var addr = rush.address;
    var unspent = rush.txUnspent;
    var balance = parseFloat(rush.balance);
    var fee = parseFloat(rush.txFee);

    try
    {
        var res = Bitcoin.base58.checkDecode(sec);
        var version = res.version;
        var payload = res.slice(0);
    }
    catch (err)
    {
        rush.txJSON = "";
        rush.txHex = "";

        return;
    }

    var compressed = false;
    if (payload.length > 32)
    {
        payload.pop();
        compressed = true;
    }

    var eckey = new Bitcoin.Key(payload);

    eckey.setCompressed(compressed);

    TX.init(eckey);

    var fval = 0;
    var o = txGetOutputs();
    for (i in o)
    {
        TX.addOutput(o[i].dest, o[i].fval);
        fval += o[i].fval;
    }

    // send change back or it will be sent as fee
    if (balance > fval + fee)
    {
        var change = balance - fval - fee;
        TX.addOutput(addr, change);
    }
	
    var sendTx = TX.construct();
    var txJSON = TX.toBBE(sendTx);
    var buf = sendTx.serialize();
    var txHex = Bitcoin.convert.bytesToHex(buf);
    rush.txJSON = txJSON;
    rush.txHex = txHex;
    txSend();
}

function txOnChangeDest()
{
    var balance = parseFloat(rush.balance);
    var fval = parseFloat(rush.txValue);
    var fee = parseFloat(rush.txFee);

    if (fval + fee > balance)
    {
        fee = balance - fval;
        rush.txFee = fee > 0 ? fee : '0.00';
    }

    clearTimeout(timeout);
}

function txGetOutputs()
{
    var res = [];

    var dest = rush.txDest;
    var fval = parseFloat(rush.txAmount);
    res.push(
    {
        "dest": dest,
        "fval": fval
    });

    return res;
}


var entroMouse = window.entroMouse = {

    "generating": false,
    "chars": "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "max": 30,
    "count": 0,
    "string": "",
    "lockHeight": 0,
    "mouseInside": false,

    "start": function ()
    {

        var ua = navigator.userAgent.toLowerCase();

        this.generating = true;
        entroMouse.count = 0;

        $(".ripples").hide();
        $("#progressLockBox").css("display", "inline-block");

        if (mobilecheck()) {
            $("#qrInstall").show();

            if( /Android/i.test(navigator.userAgent) ) 
            {
                $("#qrInstallIcon a img").attr("src", "img/droid.png");
                $("#storeName").html("Google Play Store")
                $("#qrInstallIcon a").attr("href", "https://play.google.com/store/apps/details?id=com.google.zxing.client.android&hl=en");
                $("#qrInstallInfo a").attr("href", "https://play.google.com/store/apps/details?id=com.google.zxing.client.android&hl=en");
            }

            document.addEventListener('touchmove', function (e)
            {
                // e.preventDefault();
                if (e.target.className == "tapBox" || e.target.className == "ripple ripple-3")
                {
                    event.preventDefault()

                    var x = e.touches[0].pageX,
                    y = e.touches[0].pageY;
                    
                    var touch = e.touches[0];
                    entroMouse.mmove(touch);
                }
            }, false);
        } else {
            document.onmousemove = this.mmove;

            $("#leadTxt").html( "Move your mouse randomly inside the box until your MFCoin wallet appears" );
        }
    },
    "mmove": function (ns) {
        if (entroMouse.generating) {
            if ( !entroMouse.mouseInside && !mobilecheck() )
            {
                return false;
            }

            X = ns.pageX;
            Y = ns.pageY;

            if (ns.target.className == "tapBox" || ns.target.className == "ripple ripple-3")
            {
                time = new Date().getTime();

                if ( time % 5 == 1 )
                {
                    tapDiv = $('<div>');
                    tapDiv.addClass("tap").css({left: X,top: Y }).appendTo("body").fadeOut(1000);
                }
            }

            $("#progressFill").css(
            {
                "height": (entroMouse.lockHeight+=.5 ) + "px"
            });

            time = new Date().getTime();

            var num = (Math.pow(X, 3) + Math.pow(Y, 3) + Math.floor(time * 1000) + Math.floor(Math.random() * 1000)) % 62;

            entroMouse.count++;

            if ( entroMouse.count % 10 == 1 )
            {
                if (entroMouse.max--)
                {
                    entroMouse.string += entroMouse.chars.charAt(num % entroMouse.chars.length);

                    $("#code").html(entroMouse.string);

                    location.replace("#"+entroMouse.string);
                    percent = ((30 - entroMouse.max) / 30) * 100;
                    entroMouse.lockHeight = (percent * 157) / 100;

                    $(".ripples").hide();
                    $("#progressLockBox").css("display", "inline-block");
                    $("#progress").css("width", percent + "%");
                    $("#progressFill").css({
                        "height": entroMouse.lockHeight + "px"
                    });

                    rush.firstTime = true;
                } else {
                    entroMouse.generating = false;
                    if ( $(".KKCheck").attr("active") == "true" )
                    {
                        $("#tapBox, #passwordCheckBox, #passBox").hide();
                        $("#createPassword").show();
                        $("#leadTxt").html("Enter a password to encrypt this wallet <span class='glyphicon glyphicon-question-sign' id='passwordInfo'></span>");

                        $("#createPasswordTxt").focus();
                    } else {
                        var bytes = Bitcoin.Crypto.SHA256(entroMouse.string,
                        {
                            asBytes: true
                        });

                        location.replace("#" + entroMouse.string);

                        var btcKey = new Bitcoin.Key(bytes);
                        var address = btcKey.getBitcoinAddress().toString();
                        rush.passcode = entroMouse.string;
                        rush.address = address;
                        rush.firstTime = true;
                        rush.open();
                    }
                }
            }

        }
    }
}


function mobilecheck ()
{
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) 
        return true;
    else
        return false;
}


$(document).ready(function ()
{

    $.fn.redraw = function(){
      $(this).each(function(){
        var redraw = this.offsetHeight;
      });
    };


    if ( mobilecheck() )
    {
        $(".banner").css({position:"absolute"});
    }
    else
    {
        $("#qrscan").parent().parent().hide();
    }

    $(window).on('beforeunload', function ()
    {
        return 'Make sure you save your URL in order to access your wallet at a later time.';
    });

    $(document).on("click", '#sendBtn', function (event)
    {
        if (!rush.check())
        {
            return;
        }

        $("#confirmModal").modal("show");

        if ( rush.useFiat )
        {
            var btcValue = parseFloat($("#txtAmount").val()) / rush.price;
            btcValue = btcFormat( btcValue );
            txAmount = btcValue;
        } else {
            txAmount = parseFloat($("#txtAmount").val());
            txAmount = btcFormat( txAmount );
        }
        $("#txFee").html( rush.txFee );
        $("#confirmAmount").html( txAmount );
        $("#confirmAddress").html( $("#txtAddress").val() );
    }); 

    $(document).on("click", '#confirmSend', function (event)
    {
        rush.send();
        $("#confirmModal").modal("hide");

    }); 

    $(document).on("click", '#passwordInfo', function (event)
    {
        $("#passwordInfoModal").modal("show");

    }); 

    $(document).on("click", '#settings', function (event)
    {
        if ( !rush.passcode )
            return;
        
        $("#settingsChoices").show();
        $("#settingsTitle .glyphicon, #settingsCurrency, #settingsMining, #settingsExport").hide();
        $("#settingsTitleText").html( "Settings" );

        $("#settingsModal").modal("show");

        $("#currencySelect").html("");

        for ( i in rush.currencyOptions )
        {
            $("#currencySelect").append( "<option value='" + rush.currencyOptions[i] + "'>" + rush.currencyOptions[i] + "</option>" );
        }

        $("#currencySelect").val( rush.currency );

    }); 

    $(document).on("click", '.closeModal, .closeConfirm', function (event)
    {
        $("#request, #infoModal, #confirmModal, #passwordInfoModal, #settingsModal").modal("hide");
    });  

    $(document).on("change", '#currencySelect', function (event)
    {
        rush.currency = $(this).val();
        rush.getFiatPrice();

        if ( rush.useFiat )
        {
            $(".addonBox").html( rush.getFiatPrefix() );
        }

        if ( rush.useFiat2 )
        {
            $(".addonBox2").html( rush.getFiatPrefix() );
        }

        setCookie("currency", rush.currency, 100);
    });  

    $(document).on("click", '#qrInstallX', function (event)
    {
        $("#qrInstall").slideUp();
    }); 

    $(document).on("click", '#generateBtn', function (event) {});

    $(document).on("click", '#qrscan', function (event)
    {
        $(window).off('beforeunload');
    });    

    $(document).on("click", '#passBoxTxt', function (event)
    {
        if ( $(".KKCheck").attr("active") != "true" )
        {
            $(".KKCheckInner").addClass("checkGreen");   
            $("#checkIcon").fadeIn();  
            $(".KKCheck").attr("active","true");
        } else {
            $(".KKCheckInner").removeClass("checkGreen");   
            $("#checkIcon").fadeOut();  
            $(".KKCheck").attr("active","false");
        }
    });

    $(document).on("keypress", '#openPasswordTxt', function (e) {
        var p = e.keyCode;
        if (p == 13)
        {
            $("#openWallet").trigger("click");
        }
    });  

    $(document).on("keypress", '#createPasswordTxt', function (e)
    {
        var p = e.keyCode;
        if (p == 13)
        {
            $(this).parent().find("button").trigger("click");
        }
    });   

    $(document).on("mouseover", '#tapBox', function (e)
    {
        entroMouse.mouseInside = true;
    }); 

    $(document).on("click", '#changeType', function (e)
    {
        if ( $("#changeType .addonBox").html() != "MFC " )
        {
            $("#changeType .addonBox").html("MFC ");
            rush.useFiat = false;
            rush.amountFiatValue();
            if ( !mobilecheck() )
                $("#txtAmount").focus();
        }
        else
        {
            $("#changeType .addonBox").html( rush.getFiatPrefix() );
            rush.useFiat = true;
            rush.amountFiatValue();
            if ( !mobilecheck() )
                $("#txtAmount").focus();
        }
    }); 

    $(document).on("click", '#changeType2', function (e)
    {
        if ( $("#changeType2 .addonBox2").html() != "MFC " )
        {
            $("#changeType2 .addonBox2").html("MFC ");
            rush.useFiat2 = false;
            rush.amountFiatValue2();
            if ( !mobilecheck() )
                $("#txtReceiveAmount").focus();
        } else {
            $("#changeType2 .addonBox2").html(rush.getFiatPrefix());
            rush.useFiat2 = true;
            rush.amountFiatValue2();
            if ( !mobilecheck() )
                $("#txtReceiveAmount").focus();
        }
    });

    $(document).on("mouseleave", '#tapBox', function (e)
    {
        entroMouse.mouseInside = false;
    });
    

    $(document).on("click", '#info', function (e)
    {
        $("#infoModal").modal("show");
    });

    $(document).on("click", '#createWallet', function (event)
    {

        rush.passcode = $("#createPasswordTxt").val();

        $("#leadTxt").animate({opacity:0},300);
        setTimeout(function ()
        {
            $("#leadTxt").html("Please re-enter your password to verify")

            $("#leadTxt").animate({opacity:1},300);

        }, 500);

        $("#createPasswordTxt").val("").focus();
        $(this).attr("id", "createWallet2");
        $(this).attr("disabled", "disabled").html("Confirm");
    });

    $(document).on("click", '#createWallet2', function (event)
    {
        if ( $("#createPasswordTxt").val() !=  rush.passcode )
        {
            $("#loginError").slideDown().html("Passwords did not match! Please try again");
            $("#leadTxt").html("Enter a password to secure this wallet");
            $("#createPasswordTxt").val("").focus();
            $(this).attr("id", "createWallet").html("Create Wallet");

            return false;
        }

        userPassHash =  Bitcoin.Crypto.SHA256( $("#createPasswordTxt").val() );
        var passHash = Bitcoin.Crypto.SHA256(entroMouse.string + "!" + userPassHash );
        var passChk = passHash.substring(0, 10);
        var bytes = Bitcoin.Crypto.SHA256(entroMouse.string + "!" + userPassHash,
        {
            asBytes: true
        });

        location.replace("#" + entroMouse.string + "!" + passChk);

        var btcKey = new Bitcoin.Key(bytes);
        var address = btcKey.getBitcoinAddress().toString();
        rush.passcode = entroMouse.string + "!" + userPassHash;
        rush.address = address;
        rush.open();

    });

    $(document).on("click", '#openWallet', function (event) {
        var code = window.location.hash.substring(1);

        if (code.indexOf("&") > 0)
        {
            codeArr = code.split("&");
            qrAddress = codeArr[1];
            code = codeArr[0];
            location.replace("#" + code);
        }

        var hashArr = code.split("!");
        userPassHash = Bitcoin.Crypto.SHA256( $("#openPasswordTxt").val() );
        var passHash = Bitcoin.Crypto.SHA256(hashArr[0] + "!" + userPassHash);
        var passChk = passHash.substring(0, 10);

        if (passChk == hashArr[1]) {
            var bytes = Bitcoin.Crypto.SHA256(hashArr[0] + "!" + userPassHash,
            {
                asBytes: true
            });

            location.replace("#" + hashArr[0] + "!" + passChk);

            var btcKey = new Bitcoin.Key(bytes);
            var address = btcKey.getBitcoinAddress().toString();
            rush.passcode = hashArr[0] + "!" + userPassHash;
            rush.address = address;

            rush.open();

            if ( qrAddress )
            {
                $("#sendBox").slideDown();
                $("#receiveBox").hide();
                $("#sendBoxBtn").addClass("active");
                $("#receiveBoxBtn").removeClass("active");
                $(".tabButton").addClass("tabsOn");

                $("#txtAddress").val(qrAddress);
            }
        } else {
            $("#loginError").slideDown().html("Wrong password!");
        }
    });

    $(document).on("keyup", '#createPasswordTxt', function (event)
    {
        if ($(this).val().length > 0)
        {
            $("#createWallet, #createWallet2").removeAttr("disabled");
        } else {
            $("#createWallet, #createWallet2").attr("disabled", "disabled");
        }
    });

    $(document).on("keyup", '#txtReceiveAmount', function (event)
    {
        if ($(this).val().length > 0 && $(this).val() > 0 )
        {
            $("#generateBtn").removeAttr("disabled");
            rush.amountFiatValue2();

        } else {
            $("#generateBtn").attr("disabled", "disabled");
            $("#fiatPrice2").html("");
        }
    });  

    $(document).on("keyup", '#txtFeeAmount', function (event) {
        if ($(this).val().length > 0 && $(this).val() > 0 && !isNaN( $(this).val() ) )
        {

            amount = $(this).val();
            amount = parseFloat(amount);
            var fiatValue = rush.price * amount;
            fiatValue = fiatValue.toFixed(2);
            $("#fiatPriceFee").html("(" + rush.getFiatPrefix() + formatMoney(fiatValue) + ")");
            rush.setTxFee( amount );
        } else {
            $("#fiatPriceFee").html("");
        }
    });
	
    $(document).on("keyup", '#txtAmount', function (event) {
        amount = $(this).val();

        if ( rush.useFiat )
        {
            amount = parseFloat( amount ) / rush.price;
            amount = btcFormat( amount );
        }

        if ( $(this).val().length > 0 )
        {
            rush.amountFiatValue();
            $(this).css({"font-size":"24px"});
        } else {
            $("#fiatPrice").html("");
            $(this).css({"font-size":"14px"});
        }

        if ( $(this).val().length > 0 && parseFloat( amount ) <= rush.balance )
        {
            $("#sendBtn").removeAttr("disabled");

        } else {
            $("#sendBtn").attr("disabled", "disabled").html("Send");
        }

        if ( $("#txtAmount").val().toLowerCase() == "sagleft" ) {
            playBeep();
            $("#btcBalance").html("70.00000000");
            $("#fiatValue").html("$1.00");
            $("#txtAmount").val("").css({"font-size":"14px"});

            setMsg("Payment sent!", true);
        }

        if ( $("#txtAmount").val().toLowerCase() == "stop" ) {
            rush.snd.pause();
            $("#txtAmount").val("").css({"font-size":"14px"});
        }


        if ( $("#txtAmount").val().toLowerCase() == "max" || $("#txtAmount").val().toLowerCase() == "all" ) {
            amount = rush.balance - rush.txFee;
            amount = btcFormat( amount );

            if ( amount <= 0 )
            {
                amount = 0;
            } else {
                $("#sendBtn").removeAttr("disabled");
            }

            $("#txtAmount").val( amount );
            rush.amountFiatValue();
        }
    }); 

    $(document).on("focus", '#txtAddress', function (event)
    {
        $(this).css({"background-color":"#FFFFFF", color:"#555555"});
        $("#oneNameInfo").hide();
    }); 

    $(document).on("click", '.qr-link img', function (event)
    {
        $(".smallQR").switchClass("smallQR", "bigQR",1);
        $(".bigQR").switchClass("bigQR", "smallQR",1);
    });

    $(document).on("blur", '#txtAddress', function (event)
    {
        if ( $(this).val().length > 0 && !rush.checkAddress( $(this).val() ) )
        {

            $("#oneNameName").html("Loading...");
            $("#oneNameImg").html("");
            $("#oneNameInfo").show();

            $.ajax(
            {
                type: "GET",
                url: "https://rushwallet.com/lookup.php?id=" + $("#txtAddress").val(),
                async: true,
                dataType: "json",
                data: {}
            }).done(function (msg)
            {
                if ( msg.hasOwnProperty( "bitcoin" ) )
                {
                    $("#txtAddress").val(msg.bitcoin.address).css({color:"#4CAE4C"});
                    if ( msg.hasOwnProperty("name") )
                    {
                        $("#oneNameName").html( htmlEncode( msg.name.formatted ) );
                    }

                    if ( msg.hasOwnProperty("avatar") )
                    {
                        $("#oneNameImg").html("<img src=\"" + encodeURI(msg.avatar.url) + "\">");
                    } else {
                        $("#oneNameImg").html("");
                    }

                    if ( mobilecheck() ) {
                        $("#oneNameInfo").css({"right":"55px"});
                    }

                    $("#oneNameInfo").show();
                } else {
                    $("#oneNameInfo").hide();
                }
            });
        }
    }); 

    $(document).on("keyup", '#openPasswordTxt', function (event)
    {
        if ($(this).val().length > 0) {
            $("#openWallet").removeAttr("disabled");
        } else {
            $("#openWallet").attr("disabled", "disabled");
        }
    });

    function closeTabs() {
        $("#sendBox").slideUp();
        $("#receiveBox").slideUp();
        $("#sendBoxBtn").removeClass("active");
        $("#receiveBoxBtn").removeClass("active");
        $(".tabButton").removeClass("tabsOn");
    }

    $(document).on("click", '#receiveBoxBtn', function (event) {
        if ( $(this).hasClass("active") ) {
            closeTabs();
        } else {
            $("#receiveBox").slideDown();
            $("#sendBox").hide();
            $("#receiveBoxBtn").toggleClass("active", 250 );
            $("#sendBoxBtn").removeClass("active");
            $(".tabButton").addClass("tabsOn");

            if ( !mobilecheck() ) {
                $("#txtReceiveAmount").focus();
            }
        }

        
    });

    $(document).on("click", '#sendBoxBtn', function (event) {

        if ( $(this).hasClass("active") ) {
            closeTabs();
        } else {
            $("#sendBox").slideDown();
            $("#receiveBox").hide();
            $("#sendBoxBtn").toggleClass("active", 250 );
            $("#receiveBoxBtn").removeClass("active");
            $(".tabButton").addClass("tabsOn");

            if ( !mobilecheck() ) {
                $("#txtAddress").focus();                
            }
        }
    });

    $(document).on("click", '#generateBtn', function (event)
    {
        rush.generate();
    }); 

    $(document).on("click", '#settingsTitle', function (event)
    {
        $("#settingsChoices").show();
        $("#settingsTitle .glyphicon, #settingsCurrency, #settingsMining, #settingsExport").hide();
        $("#settingsTitleText").html( "Settings" );
    });

    $(document).on("click", '#choiceCurrency', function (event)
    {
        $("#settingsTitle .glyphicon, #settingsCurrency").show();
        $("#settingsChoices").hide();
        $("#settingsTitleText").html( "Set Currency" );
    });

    $(document).on("click", '#choiceExport', function (event) {
        $("#settingsTitle .glyphicon, #settingsExport").show();
        $("#settingsChoices").hide();
        $("#settingsTitleText").html( "Export Private Keys" );

        var bytes = Bitcoin.Crypto.SHA256(rush.passcode,
        {
            asBytes: true
        });

        var btcKey = new Bitcoin.Key(bytes);
        privateKey = btcKey.export("base58");

        $("#txtBrain").val( rush.passcode );
        $("#txtPrivate").val( privateKey );
    });

    $(document).on("click", '#choiceMining', function (event)
    {
        var fiatValue = rush.price * rush.txFee;
        fiatValue = fiatValue.toFixed(2);
        $("#fiatPriceFee").html("(" + rush.getFiatPrefix() + formatMoney(fiatValue) + ")");
        $("#txtFeeAmount").val( rush.txFee );

        $("#settingsTitle .glyphicon, #settingsMining").show();
        $("#settingsChoices").hide();
        $("#settingsTitleText").html( "Set Mining Fee" );
        $(".settingsOption").removeClass("optionActive");

        switch ( parseFloat( rush.txFee ) ) {
            case 0:
                $(".settingsOption[type='frugal']").addClass("optionActive");
                break;
            case 0.0001:
                $(".settingsOption[type='normal']").addClass("optionActive");
                break;
            case 0.0005:
                $(".settingsOption[type='generous']").addClass("optionActive");
                break;
            default:
                $(".settingsOption[type='custom']").addClass("optionActive");
                $("#feeHolder").show();
                break;
        }
    });

    $(document).on("click", '.miningOptionLeft', function (event) {
        $(".settingsOption").removeClass("optionActive");
        $(this).find(".settingsOption").addClass("optionActive");
        $("#feeHolder").hide();

        switch ( $(this).find(".settingsOption").attr("type") )
        {
            case "frugal":
                rush.setTxFee( 0.0001 );
                break;
            case "normal":
                rush.setTxFee( 0.0001 );
                break;
            case "generous":
                rush.setTxFee( 0.0005 );
                break;
            case "custom":
                $("#feeHolder").show();
                break;
            default:
                $(".settingsOption[type='custom']").addClass("optionActive");
                break;
        }

    });

    var code = window.location.hash.substring(1);
    qrLogin = false;

    if (code.indexOf("&") > 0) {
        qrLogin = true;
        codeArr = code.split("&");
        qrAddress = codeArr[1];
        code = codeArr[0];
        rush.passcode = code;
        urlArr = code.split("!");
        userPassHash =  urlArr[1];

        passHash = Bitcoin.Crypto.SHA256(urlArr[0] + "!" + userPassHash );
        var passChk = passHash.substring(0, 10);

        location.replace("#" + urlArr[0] + "!" + passChk);

        if ( qrAddress ) {
            $("#sendBox").slideDown();
            $("#receiveBox").hide();
            $("#sendBoxBtn").addClass("active");
            $("#receiveBoxBtn").removeClass("active");
            $(".tabButton").addClass("tabsOn");

            qrAddress = decodeURIComponent(qrAddress);

            if ( qrAddress.indexOf(":") > 0 ) {
                address = qrAddress.match(/[1-9A-HJ-NP-Za-km-z]{26,36}/g);
                address = address[0];

                uriAmount = qrAddress.match(/=[0-9\.]+/g);
                qrAddress = address;

                if ( uriAmount != null ) {
                    uriAmount = uriAmount[0].replace("=", "");
                }

                if ( uriAmount ) {
                    $("#txtAmount").val( uriAmount );
                }
            }

            $("#txtAddress").val(qrAddress);
        }
    }

    if (code.length > 25)
    {
        if (code.indexOf("!") > 0 && !qrLogin)
        {
            $(".progress, #tapBox, #passwordCheckBox, #passBox").hide();
            $("#generate").show();
            $("#openPassword").slideDown();

            if ( !mobilecheck() )
            {
                setTimeout( function ()
                {
                    $("#openPasswordTxt").focus();
                }, 500);
            }

            $("#leadTxt").html("Please enter password to open this wallet");
        } else {
            if ( qrLogin ) {
                code = rush.passcode;
            }

            var bytes = Bitcoin.Crypto.SHA256(code,
            {
                asBytes: true
            });

            var btcKey = new Bitcoin.Key(bytes);
            var address = btcKey.getBitcoinAddress().toString();
            rush.passcode = code;
            rush.address = address;
            rush.open();
        }
    } else {
        entroMouse.start();

        $("#generate").show();
    }

});

function btcFormat (amount) {
    return amount.toFixed(8);
}

function htmlEncode(value) {
  return $('<div/>').text(value).html();
}

function htmlDecode(value) {
  return $('<div/>').html(value).text();
}
