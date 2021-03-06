// contains already called method names
var _called = {};

chrome.extension.onMessage.addListener(function(req, sender, callback) {
	if ('action' in req) {
		if(req.action == "fill_user_pass_with_specific_login") {
			if(cip.credentials[req.id]) {
				var combination = null;
				if (cip.u) {
					cip.u.val(cip.credentials[req.id].Login);
					combination = cipFields.getCombination("username", cip.u);
					cip.u.focus();
				}
				if (cip.p) {
					cip.p.val(cip.credentials[req.id].Password);
					combination = cipFields.getCombination("password", cip.p);
				}

                var list = {};
				if(cip.fillInStringFields(combination.fields, cip.credentials[req.id].StringFields, list)) {
                    cipForm.destroy(false, {"password": list.list[0], "username": list.list[1]});
                }
			}
			// wish I could clear out _logins and _u, but a subsequent
			// selection may be requested.
		}
		else if (req.action == "fill_user_pass") {
			cip.fillInFromActiveElement(false);
		}
		else if (req.action == "fill_pass_only") {
			cip.fillInFromActiveElementPassOnly(false);
		}
		else if (req.action == "activate_password_generator") {
			cip.initPasswordGenerator(cipFields.getAllFields());
		}
		else if(req.action == "remember_credentials") {
			cip.contextMenuRememberCredentials();
		}
		else if (req.action == "choose_credential_fields") {
			cipDefine.init();
		}
		else if (req.action == "clear_credentials") {
			cipEvents.clearCredentials();
		}
        else if (req.action == "activated_tab") {
            cipEvents.triggerActivatedTab();
        }
        else if (req.action == "check_for_new_input_fields") {
            cip.checkForNewInputs();
        }
		else if (req.action == "redetect_fields") {
			chrome.extension.sendMessage({
				"action": "get_settings",
			}, function(response) {
				cip.settings = response.data;
				cip.initCredentialFields(true);
			});
		}
	}
});

// Hotkeys for every page
// ctrl + shift + p = fill only password
// ctrl + shift + u = fill username + password
window.addEventListener("keydown", function(e) {
	if (e.ctrlKey && e.shiftKey) {
		if (e.keyCode == 80) { // P
			e.preventDefault();
			cip.fillInFromActiveElementPassOnly(false);
		} else if (e.keyCode == 85) { // U
			e.preventDefault();
			cip.fillInFromActiveElement(false);
		}
	}
}, false);

function _f(fieldId) {
	var field = (fieldId) ? mpJQ("input[data-mp-id='"+fieldId+"']:first") : [];
	return (field.length > 0) ? field : null;
}

function _fs(fieldId) {
	var field = (fieldId) ? mpJQ("input[data-mp-id='"+fieldId+"']:first,select[data-mp-id='"+fieldId+"']:first").first() : [];
	return (field.length > 0) ? field : null;
}



var cipPassword = {};

cipPassword.observedIcons = [];
cipPassword.observingLock = false;

cipPassword.init = function() {
	if("initPasswordGenerator" in _called) {
		return;
	}

	_called.initPasswordGenerator = true;

	window.setInterval(function() {
		cipPassword.checkObservedElements();
	}, 400);
}

cipPassword.initField = function(field, inputs, pos) {
	if(!field || field.length != 1) {
		return;
	}
	if(field.data("mp-password-generator")) {
		return;
	}

	field.data("mp-password-generator", true);

	cipPassword.createIcon(field);
	cipPassword.createDialog();

	var $found = false;
	if(inputs) {
		for(var i = pos + 1; i < inputs.length; i++) {
			if(inputs[i] && inputs[i].attr("type") && inputs[i].attr("type").toLowerCase() == "password") {
				field.data("mp-genpw-next-field-id", inputs[i].data("mp-id"));
				field.data("mp-genpw-next-is-password-field", (i == 0));
				$found = true;
				break;
			}
		}
	}

	field.data("mp-genpw-next-field-exists", $found);
}

cipPassword.createDialog = function() {
	if("passwordCreateDialog" in _called) {
		return;
	}

	_called.passwordCreateDialog = true;

	var $dialog = mpJQ("<div>")
		.attr("id", "mp-genpw-dialog");

	var $divFloat = mpJQ("<div>").addClass("mp-genpw-clearfix");
	var $btnGenerate = mpJQ("<button>")
		.text("Generate")
		.attr("id", "mp-genpw-btn-generate")
		.addClass("mp-bt-btn")
		.addClass("mp-bt-btn-primary")
		.addClass("mp-bt-btn-small")
		.css("float", "left")
		.click(function(e) {
			e.preventDefault();
			chrome.extension.sendMessage({
				action: "generate_password"
			}, cipPassword.callbackGeneratedPassword);
		});
	$divFloat.append($btnGenerate);

	var $btnClipboard = mpJQ("<button>")
		.text("Copy to clipboard")
		.attr("id", "mp-genpw-btn-clipboard")
		.addClass("mp-bt-btn")
		.addClass("mp-bt-btn-small")
		.css("float", "right")
		.click(function(e) {
			e.preventDefault();

			chrome.extension.sendMessage({
				action: "copy_password",
				args: [mpJQ("input#mp-genpw-textfield-password").val()]
			}, cipPassword.callbackPasswordCopied);
		});
	$divFloat.append($btnClipboard);

	$dialog.append($divFloat);

	var $textfieldPassword = mpJQ("<input>")
		.attr("id", "mp-genpw-textfield-password")
		.attr("type", "text")
		.addClass("mp-genpw-textfield")
		.on('change keypress paste textInput input', function() {
			mpJQ("#mp-genpw-btn-clipboard:first").removeClass("mp-bt-btn-success");
		});
	var $quality = mpJQ("<span>")
		.addClass("mp-bt-add-on")
		.attr("id", "mp-genpw-quality")
		.text("123 Bits");
	var $frameInputAppend = mpJQ("<div>")
		.addClass("mp-bt-input-append")
		.addClass("mp-genpw-password-frame");
	$frameInputAppend.append($textfieldPassword).append($quality);
	$dialog.append($frameInputAppend);

	var $checkboxNextField = mpJQ("<input>")
		.attr("id", "mp-genpw-checkbox-next-field")
		.attr("type", "checkbox")
		.addClass("mp-genpw-checkbox");
	var $labelNextField = mpJQ("<label>")
		.append($checkboxNextField)
		.addClass("mp-genpw-label")
		.append(" also fill in the next password-field");
	$dialog.append($labelNextField);

	var $btnFillIn = mpJQ("<button>")
		.text("Fill in & copy to clipboard")
		.attr("id", "mp-genpw-btn-fillin")
		.addClass("mp-bt-btn")
		.addClass("mp-bt-btn-small")
		.click(function(e) {
			e.preventDefault();

			var fieldId = mpJQ("#mp-genpw-dialog:first").data("mp-genpw-field-id");
			var field = mpJQ("input[data-mp-id='"+fieldId+"']:first");
			if(field.length == 1) {
				var $password = mpJQ("input#mp-genpw-textfield-password:first").val();

				if(field.attr("maxlength")) {
					if($password.length > field.attr("maxlength")) {
						$password = $password.substring(0, field.attr("maxlength"));
						mpJQ("input#mp-genpw-textfield-password:first").val($password);
						mpJQ("#mp-genpw-btn-clipboard:first").removeClass("mp-bt-btn-success");
						alert("The generated password is longer than the allowed length!\nIt has been cut to fit the length.\n\nPlease remember the new password!");
					}
				}

				field.val($password);
				if(mpJQ("input#mp-genpw-checkbox-next-field:checked").length == 1) {
					if(field.data("mp-genpw-next-field-exists")) {
						var nextFieldId = field.data("mp-genpw-next-field-id");
						var nextField = mpJQ("input[data-mp-id='"+nextFieldId+"']:first");
						if(nextField.length == 1) {
							nextField.val($password);
						}
					}
				}

				// copy password to clipboard
				chrome.extension.sendMessage({
					action: "copy_password",
					args: [$password]
				}, cipPassword.callbackPasswordCopied);
			}
		});
	$dialog.append($btnFillIn);

	$dialog.hide();
	mpJQ("body").append($dialog);
	$dialog.dialog({
		closeText: "×",
		autoOpen: false,
		modal: true,
		resizable: false,
		minWidth: 340,
		title: "Password Generator",
		open: function(event, ui) {
			mpJQ(".mp-ui-widget-overlay").click(function() {
				mpJQ("#mp-genpw-dialog:first").dialog("close");
			});

			if(mpJQ("input#mp-genpw-textfield-password:first").val() == "") {
				mpJQ("button#mp-genpw-btn-generate:first").click();
			}
		}
	});
}

cipPassword.createIcon = function(field) {
	var $className = (field.outerHeight() > 28) ? "mp-icon-key-big" : "mp-icon-key-small";
	var $size = (field.outerHeight() > 28) ? 24 : 16;
	var $offset = Math.floor((field.outerHeight() - $size) / 3);
	$offset = ($offset < 0) ? 0 : $offset;

	var $zIndex = 0;
	var $zIndexField = field;
	var z;
	var c = 0;
	while($zIndexField.length > 0) {
		if(c > 100 || $zIndexField[0].nodeName == "#document") {
			break;
		}
		z = $zIndexField.css("z-index");
		if(!isNaN(z) && parseInt(z) > $zIndex) {
			$zIndex = parseInt(z);
		}
		$zIndexField = $zIndexField.parent();
		c++;
	}

	if(isNaN($zIndex) || $zIndex < 1) {
		$zIndex = 1;
	}
	$zIndex += 1;

	var $icon = mpJQ("<div>").addClass("mp-genpw-icon")
		.addClass($className)
		.css("z-index", $zIndex)
		.data("size", $size)
		.data("offset", $offset)
		.data("mp-genpw-field-id", field.data("mp-id"));
	cipPassword.setIconPosition($icon, field);
	$icon.click(function(e) {
		e.preventDefault();

		if(!field.is(":visible")) {
			$icon.remove();
			field.removeData("mp-password-generator");
			return;
		}

		var $dialog = mpJQ("#mp-genpw-dialog");
		if($dialog.dialog("isOpen")) {
			$dialog.dialog("close");
		}
		$dialog.dialog("option", "position", { my: "left-10px top", at: "center bottom", of: mpJQ(this) });
		$dialog.data("mp-genpw-field-id", field.data("mp-id"));
		$dialog.data("mp-genpw-next-field-id", field.data("mp-genpw-next-field-id"));
		$dialog.data("mp-genpw-next-is-password-field", field.data("mp-genpw-next-is-password-field"));

		var $bool = Boolean(field.data("mp-genpw-next-field-exists"));
		mpJQ("input#mp-genpw-checkbox-next-field:first")
			.attr("checked", $bool)
			.attr("disabled", !$bool);

		$dialog.dialog("open");
	});

	cipPassword.observedIcons.push($icon);

	mpJQ("body").append($icon);
}

cipPassword.setIconPosition = function($icon, $field) {
	$icon.css("top", $field.offset().top + $icon.data("offset") + 1)
		.css("left", $field.offset().left + $field.outerWidth() - $icon.data("size") - $icon.data("offset"))
}

cipPassword.callbackPasswordCopied = function(bool) {
	if(bool) {
		mpJQ("#mp-genpw-btn-clipboard").addClass("mp-bt-btn-success");
	}
}

cipPassword.callbackGeneratedPassword = function(entries) {
	if(entries && entries.length >= 1) {
		console.log(entries[0]);
		mpJQ("#mp-genpw-btn-clipboard:first").removeClass("mp-bt-btn-success");
		mpJQ("input#mp-genpw-textfield-password:first").val(entries[0].Password);
		if(isNaN(entries[0].Login)) {
			mpJQ("#mp-genpw-quality:first").text("??? Bits");
		}
		else {
			mpJQ("#mp-genpw-quality:first").text(entries[0].Login + " Bits");
		}
	}
	else {
		if(mpJQ("div#mp-genpw-error:first").length == 0) {
			mpJQ("button#mp-genpw-btn-generate:first").after("<div style='block' id='mp-genpw-error'>Cannot receive generated password.<br />Is your version of KeePassHttp up-to-date?<br /><br /><a href='https://github.com/pfn/keepasshttp/'>Please visit the KeePassHttp homepage</a></div>");
			mpJQ("input#mp-genpw-textfield-password:first").parent().hide();
			mpJQ("input#mp-genpw-checkbox-next-field:first").parent("label").hide();
			mpJQ("button#mp-genpw-btn-generate").hide();
			mpJQ("button#mp-genpw-btn-clipboard").hide();
			mpJQ("button#mp-genpw-btn-fillin").hide();
		}
	}
}

cipPassword.onRequestPassword = function() {
	chrome.extension.sendMessage({
		'action': 'generate_password'
	}, cipPassword.callbackGeneratedPassword);
}

cipPassword.checkObservedElements = function() {
	if(cipPassword.observingLock) {
		return;
	}

	cipPassword.observingLock = true;
	mpJQ.each(cipPassword.observedIcons, function(index, iconField) {
		if(iconField && iconField.length == 1) {
			var fieldId = iconField.data("mp-genpw-field-id");
			var field = mpJQ("input[data-mp-id='"+fieldId+"']:first");
			if(!field || field.length != 1) {
				iconField.remove();
				cipPassword.observedIcons.splice(index, 1);
			}
			else if(!field.is(":visible")) {
				iconField.hide();
				//field.removeData("mp-password-generator");
			}
			else if(field.is(":visible")) {
				iconField.show();
				cipPassword.setIconPosition(iconField, field);
				field.data("mp-password-generator", true);
			}
		}
		else {
			cipPassword.observedIcons.splice(index, 1);
		}
	});
	cipPassword.observingLock = false;
}



var cipForm = {};

cipForm.init = function(form, credentialFields) {
	// TODO: could be called multiple times --> update credentialFields

	// not already initialized && password-field is not null
	if(!form.data("cipForm-initialized") && credentialFields.password) {
		form.data("cipForm-initialized", true);
		cipForm.setInputFields(form, credentialFields);
		form.submit(cipForm.onSubmit);
	}
}

cipForm.destroy = function(form, credentialFields) {
    if(form === false && credentialFields) {
        var field = _f(credentialFields.password) || _f(credentialFields.username);
		if(field) {
			form = field.closest("form");
		}
    }

    if(form && mpJQ(form).length > 0) {
        mpJQ(form).unbind('submit', cipForm.onSubmit);
    }
}

cipForm.setInputFields = function(form, credentialFields) {
	form.data("cipUsername", credentialFields.username);
	form.data("cipPassword", credentialFields.password);
}

cipForm.onSubmit = function(event) {
	var usernameId = mpJQ(this).data("cipUsername");
	var passwordId = mpJQ(this).data("cipPassword");

	var usernameValue = "";
	var passwordValue = "";

	var usernameField = _f(usernameId);
	var passwordField = _f(passwordId);

	if(usernameField) {
		usernameValue = usernameField.val();
        console.log('submit: username "'+usernameValue);
	}
	if(passwordField) {
		passwordValue = passwordField.val();
        console.log('submit: password');
	}


	cip.rememberCredentials(event, usernameField, usernameValue, passwordField, passwordValue);
};



var cipDefine = {};

cipDefine.selection = {
	"username": null,
	"password": null,
	"fields": {}
};
cipDefine.eventFieldClick = null;

cipDefine.init = function () {
	var $backdrop = mpJQ("<div>").attr("id", "mp-bt-backdrop").addClass("mp-bt-modal-backdrop");
	mpJQ("body").append($backdrop);

	var $chooser = mpJQ("<div>").attr("id", "mp-bt-cipDefine-fields");
	mpJQ("body").append($chooser);

	var $description = mpJQ("<div>").attr("id", "mp-bt-cipDefine-description");
	$backdrop.append($description);

	cipFields.getAllFields();
	cipFields.prepareVisibleFieldsWithID("select");

	cipDefine.initDescription();

	cipDefine.resetSelection();
	cipDefine.prepareStep1();
	cipDefine.markAllUsernameFields($chooser);
}

cipDefine.initDescription = function() {
	var $description = mpJQ("div#mp-bt-cipDefine-description");
	var $h1 = mpJQ("<div>").addClass("mp-bt-chooser-headline");
	$description.append($h1);
	var $help = mpJQ("<div>").addClass("mp-bt-chooser-help").attr("id", "mp-bt-help");
	$description.append($help);

	var $btnDismiss = mpJQ("<button>").text("Dismiss").attr("id", "mp-bt-btn-dismiss")
		.addClass("mp-bt-btn").addClass("mp-bt-btn-danger")
		.click(function(e) {
			mpJQ("div#mp-bt-backdrop").remove();
			mpJQ("div#mp-bt-cipDefine-fields").remove();
		});
	var $btnSkip = mpJQ("<button>").text("Skip").attr("id", "mp-bt-btn-skip")
		.addClass("mp-bt-btn").addClass("mp-bt-btn-info")
		.css("margin-right", "5px")
		.click(function() {
			if(mpJQ(this).data("step") == 1) {
				cipDefine.selection.username = null;
				cipDefine.prepareStep2();
				cipDefine.markAllPasswordFields(mpJQ("#mp-bt-cipDefine-fields"));
			}
			else if(mpJQ(this).data("step") == 2) {
				cipDefine.selection.password = null;
				cipDefine.prepareStep3();
				cipDefine.markAllStringFields(mpJQ("#mp-bt-cipDefine-fields"));
			}
		});
	var $btnAgain = mpJQ("<button>").text("Again").attr("id", "mp-bt-btn-again")
		.addClass("mp-bt-btn").addClass("mp-bt-btn-warning")
		.css("margin-right", "5px")
		.click(function(e) {
			cipDefine.resetSelection();
			cipDefine.prepareStep1();
			cipDefine.markAllUsernameFields(mpJQ("#mp-bt-cipDefine-fields"));
		})
		.hide();
	var $btnConfirm = mpJQ("<button>").text("Confirm").attr("id", "mp-bt-btn-confirm")
		.addClass("mp-bt-btn").addClass("mp-bt-btn-primary")
		.css("margin-right", "15px")
		.click(function(e) {
			if(!cip.settings["defined-credential-fields"]) {
				cip.settings["defined-credential-fields"] = {};
			}

			if(cipDefine.selection.username) {
				cipDefine.selection.username = cipFields.prepareId(cipDefine.selection.username);
			}

			var passwordId = mpJQ("div#mp-bt-cipDefine-fields").data("password");
			if(cipDefine.selection.password) {
				cipDefine.selection.password = cipFields.prepareId(cipDefine.selection.password);
			}

			var fieldIds = [];
			var fieldKeys = Object.keys(cipDefine.selection.fields);
			for(var i = 0; i < fieldKeys.length; i++) {
				fieldIds.push(cipFields.prepareId(fieldKeys[i]));
			}

			cip.settings["defined-credential-fields"][document.location.origin] = {
				"username": cipDefine.selection.username,
				"password": cipDefine.selection.password,
				"fields": fieldIds
			};

			chrome.extension.sendMessage({
				action: 'save_settings',
				args: [cip.settings]
			});

			mpJQ("button#mp-bt-btn-dismiss").click();
		})
		.hide();

	$description.append($btnConfirm);
	$description.append($btnSkip);
	$description.append($btnAgain);
	$description.append($btnDismiss);

	if(cip.settings["defined-credential-fields"] && cip.settings["defined-credential-fields"][document.location.origin]) {
		var $p = mpJQ("<p>").html("For this page credential fields are already selected and will be overwritten.<br />");
		var $btnDiscard = mpJQ("<button>")
			.attr("id", "mp-bt-btn-discard")
			.text("Discard selection")
			.css("margin-top", "5px")
			.addClass("mp-bt-btn")
			.addClass("mp-bt-btn-small")
			.addClass("mp-bt-btn-danger")
			.click(function(e) {
				delete cip.settings["defined-credential-fields"][document.location.origin];

				chrome.extension.sendMessage({
					action: 'save_settings',
					args: [cip.settings]
				});

				chrome.extension.sendMessage({
					action: 'load_settings'
				});

				mpJQ(this).parent("p").remove();
			});
		$p.append($btnDiscard);
		$description.append($p);
	}

	mpJQ("div#mp-bt-cipDefine-description").draggable();
}

cipDefine.resetSelection = function() {
	cipDefine.selection = {
		username: null,
		password: null,
		fields: {}
	};
}

cipDefine.isFieldSelected = function($cipId) {
	return (
		$cipId == cipDefine.selection.username ||
		$cipId == cipDefine.selection.password ||
		$cipId in cipDefine.selection.fields
	);
}

cipDefine.markAllUsernameFields = function($chooser) {
	cipDefine.eventFieldClick = function(e) {
		cipDefine.selection.username = mpJQ(this).data("mp-id");
		mpJQ(this).addClass("mp-bt-fixed-username-field").text("Username").unbind("click");
		cipDefine.prepareStep2();
		cipDefine.markAllPasswordFields(mpJQ("#mp-bt-cipDefine-fields"));
	};
	cipDefine.markFields($chooser, cipFields.inputQueryPattern);
}

cipDefine.markAllPasswordFields = function($chooser) {
	cipDefine.eventFieldClick = function(e) {
		cipDefine.selection.password = mpJQ(this).data("mp-id");
		mpJQ(this).addClass("mp-bt-fixed-password-field").text("Password").unbind("click");
		cipDefine.prepareStep3();
		cipDefine.markAllStringFields(mpJQ("#mp-bt-cipDefine-fields"));
	};
	cipDefine.markFields($chooser, "input[type='password']");
}

cipDefine.markAllStringFields = function($chooser) {
	cipDefine.eventFieldClick = function(e) {
		cipDefine.selection.fields[mpJQ(this).data("mp-id")] = true;
		var count = Object.keys(cipDefine.selection.fields).length;
		mpJQ(this).addClass("mp-bt-fixed-string-field").text("String field #"+count.toString()).unbind("click");

		mpJQ("button#mp-bt-btn-confirm:first").addClass("mp-bt-btn-primary").attr("disabled", false);
	};
	cipDefine.markFields($chooser, cipFields.inputQueryPattern + ", select");
}

cipDefine.markFields = function ($chooser, $pattern) {
	//var $found = false;
	mpJQ($pattern).each(function() {
		if(cipDefine.isFieldSelected(mpJQ(this).data("mp-id"))) {
			//continue
			return true;
		}

		if(mpJQ(this).is(":visible") && mpJQ(this).css("visibility") != "hidden" && mpJQ(this).css("visibility") != "collapsed") {
			var $field = mpJQ("<div>").addClass("mp-bt-fixed-field")
				.css("top", mpJQ(this).offset().top)
				.css("left", mpJQ(this).offset().left)
				.css("width", mpJQ(this).outerWidth())
				.css("height", mpJQ(this).outerHeight())
				.attr("data-mp-id", mpJQ(this).attr("data-mp-id"))
				.click(cipDefine.eventFieldClick)
				.hover(function() {mpJQ(this).addClass("mp-bt-fixed-hover-field");}, function() {mpJQ(this).removeClass("mp-bt-fixed-hover-field");});
			$chooser.append($field);
			//$found = true;
		}
	});

	/* skip step if no entry was found
	if(!$found) {
		alert("No username field found.\nContinue with choosing a password field.");
		mpJQ("button#mp-bt-btn-skip").click();
	}
	*/
}

cipDefine.prepareStep1 = function() {
	mpJQ("div#mp-bt-help").text("").css("margin-bottom", 0);
	mpJQ("div#mp-bt-cipDefine-fields").removeData("username");
	mpJQ("div#mp-bt-cipDefine-fields").removeData("password");
	mpJQ("div.mp-bt-fixed-field", mpJQ("div#mp-bt-cipDefine-fields")).remove();
	mpJQ("div:first", mpJQ("div#mp-bt-cipDefine-description")).text("1. Choose a username field");
	mpJQ("button#mp-bt-btn-skip:first").data("step", "1").show();
	mpJQ("button#mp-bt-btn-confirm:first").hide();
	mpJQ("button#mp-bt-btn-again:first").hide();
}

cipDefine.prepareStep2 = function() {
	mpJQ("div#mp-bt-help").text("").css("margin-bottom", 0);
	mpJQ("div.mp-bt-fixed-field:not(.mp-bt-fixed-username-field)", mpJQ("div#mp-bt-cipDefine-fields")).remove();
	mpJQ("div:first", mpJQ("div#mp-bt-cipDefine-description")).text("2. Now choose a password field");
	mpJQ("button#mp-bt-btn-skip:first").data("step", "2");
	mpJQ("button#mp-bt-btn-again:first").show();
}

cipDefine.prepareStep3 = function() {
	/* skip step if no entry was found
	if(!mpJQ("div#mp-bt-cipDefine-fields").data("username") && !mpJQ("div#mp-bt-cipDefine-fields").data("password")) {
		alert("Neither an username field nor a password field were selected.\nNothing will be changed and chooser will be closed now.");
		mpJQ("button#mp-bt-btn-dismiss").click();
		return;
	}
	 */

	if(!cipDefine.selection.username && !cipDefine.selection.password) {
		mpJQ("button#mp-bt-btn-confirm:first").removeClass("mp-bt-btn-primary").attr("disabled", true);
	}

	mpJQ("div#mp-bt-help").html("Please confirm your selection or choose more fields as <em>String fields</em>.").css("margin-bottom", "5px");
	mpJQ("div.mp-bt-fixed-field:not(.mp-bt-fixed-password-field,.mp-bt-fixed-username-field)", mpJQ("div#mp-bt-cipDefine-fields")).remove();
	mpJQ("button#mp-bt-btn-confirm:first").show();
	mpJQ("button#mp-bt-btn-skip:first").data("step", "3").hide();
	mpJQ("div:first", mpJQ("div#mp-bt-cipDefine-description")).text("3. Confirm selection");
}



cipFields = {}

cipFields.inputQueryPattern = "input[type='text'], input[type='email'], input[type='password'], input[type='tel'], input[type='number'], input:not([type])";
// unique number as new IDs for input fields
cipFields.uniqueNumber = 342845638;
// objects with combination of username + password fields
cipFields.combinations = [];

cipFields.setUniqueId = function(field) {
	if(field && !field.attr("data-mp-id")) {
		// use ID of field if it is unique
		// yes, it should be, but there are many bad developers outside...
		var fieldId = field.attr("id");
		if(fieldId) {
			var foundIds = mpJQ("input#" + cipFields.prepareId(fieldId));
			if(foundIds.length == 1) {
				field.attr("data-mp-id", fieldId);
				return;
			}
		}

		// create own ID if no ID is set for this field
		cipFields.uniqueNumber += 1;
		field.attr("data-mp-id", "mpJQ"+String(cipFields.uniqueNumber));
	}
}

cipFields.prepareId = function(id) {
	return id.replace(/[:#.,\[\]\(\)' "]/g, function(m) {
												return "\\"+m
											});
}

cipFields.getAllFields = function() {
	//console.log('field call!');
	var fields = [];
	// get all input fields which are text, email or password and visible
	mpJQ(cipFields.inputQueryPattern).each(function() {
		if(cipFields.isAvailableField(this)) {
			cipFields.setUniqueId(mpJQ(this));
			fields.push(mpJQ(this));
			//console.log('field detection!', mpJQ(this));
		}
	});

	return fields;
};

cipFields.prepareVisibleFieldsWithID = function($pattern) {
	mpJQ($pattern).each(function() {
		if(cipFields.isAvailableField(this)) {
			cipFields.setUniqueId(mpJQ(this));
		}
	});
};

cipFields.isAvailableField = function($field) {
    return (
            mpJQ($field).is(":visible")
            && mpJQ($field).css("visibility") != "hidden"
            && !mpJQ($field).is(':disabled')
            && mpJQ($field).css("visibility") != "collapsed"
            && mpJQ($field).css("visibility") != "collapsed"
        );
}

cipFields.getAllCombinations = function(inputs) {
	var fields = [];
	var uField = null;
	for(var i = 0; i < inputs.length; i++) {
		if(!inputs[i] || inputs[i].length < 1) {
			continue;
		}

		if(inputs[i].attr("type") && inputs[i].attr("type").toLowerCase() == "password") {
			var uId = (!uField || uField.length < 1) ? null : cipFields.prepareId(uField.attr("data-mp-id"));

			var combination = {
				"username": uId,
				"password": cipFields.prepareId(inputs[i].attr("data-mp-id"))
			};
			fields.push(combination);

			// reset selected username field
			uField = null;
		}
		else {
			// username field
			uField = inputs[i];
		}
	}

	return fields;
}

cipFields.getCombination = function(givenType, fieldId) {
	if(cipFields.combinations.length == 0) {
		if(cipFields.useDefinedCredentialFields()) {
			return cipFields.combinations[0];
		}
	}
	// use defined credential fields (already loaded into combinations)
	if(cip.settings["defined-credential-fields"] && cip.settings["defined-credential-fields"][document.location.origin]) {
		return cipFields.combinations[0];
	}

	for(var i = 0; i < cipFields.combinations.length; i++) {
		if(cipFields.combinations[i][givenType] == fieldId) {
			return cipFields.combinations[i];
		}
	}

	// find new combination
	var combination = {
		"username": null,
		"password": null
	};

    var newCombi = false;
	if(givenType == "username") {
		var passwordField = cipFields.getPasswordField(fieldId, true);
		var passwordId = null;
		if(passwordField && passwordField.length > 0) {
			passwordId = cipFields.prepareId(passwordField.attr("data-mp-id"));
		}
		combination = {
			"username": fieldId,
			"password": passwordId
		};
        newCombi = true;
	}
	else if(givenType == "password") {
		var usernameField = cipFields.getUsernameField(fieldId, true);
		var usernameId = null;
		if(usernameField && usernameField.length > 0) {
			usernameId = cipFields.prepareId(usernameField.attr("data-mp-id"));
		}
		combination = {
			"username": usernameId,
			"password": fieldId
		};
        newCombi = true;
	}

	if(combination.username || combination.password) {
		cipFields.combinations.push(combination);
	}

    if(newCombi) {
        combination.isNew = true;
    }
	return combination;
}

/**
* return the username field or null if it not exists
*/
cipFields.getUsernameField = function(passwordId, checkDisabled) {
	var passwordField = _f(passwordId);
	if(!passwordField) {
		return null;
	}

	var form = passwordField.closest("form")[0];
	var usernameField = null;

	// search all inputs on this one form
	if(form) {
		mpJQ(cipFields.inputQueryPattern, form).each(function() {
			cipFields.setUniqueId(mpJQ(this));
			if(mpJQ(this).attr("data-mp-id") == passwordId) {
				// break
				return false;
			}

			if(mpJQ(this).attr("type") && mpJQ(this).attr("type").toLowerCase() == "password") {
				// continue
				return true;
			}

			usernameField = mpJQ(this);
		});
	}
	// search all inputs on page
	else {
		var inputs = cipFields.getAllFields();
		cip.initPasswordGenerator(inputs);
		for(var i = 0; i < inputs.length; i++) {
			if(inputs[i].attr("data-mp-id") == passwordId) {
				break;
			}

			if(inputs[i].attr("type") && inputs[i].attr("type").toLowerCase() == "password") {
				continue;
			}

			usernameField = inputs[i];
		}
	}

	if(usernameField && !checkDisabled) {
		var usernameId = usernameField.attr("data-mp-id");
		// check if usernameField is already used by another combination
		for(var i = 0; i < cipFields.combinations.length; i++) {
			if(cipFields.combinations[i].username == usernameId) {
				usernameField = null;
				break;
			}
		}
	}

	cipFields.setUniqueId(usernameField);

	return usernameField;
}

/**
* return the password field or null if it not exists
*/
cipFields.getPasswordField = function(usernameId, checkDisabled) {
	var usernameField = _f(usernameId);
	if(!usernameField) {
		return null;
	}

	var form = usernameField.closest("form")[0];
	var passwordField = null;

	// search all inputs on this one form
	if(form) {
		passwordField = mpJQ("input[type='password']:first", form);
		if(passwordField.length < 1) {
			passwordField = null;
		}

		if(cip.settings.usePasswordGenerator) {
			cipPassword.init();
			cipPassword.initField(passwordField);
		}
	}
	// search all inputs on page
	else {
		var inputs = cipFields.getAllFields();
		cip.initPasswordGenerator(inputs);

		var active = false;
		for(var i = 0; i < inputs.length; i++) {
			if(inputs[i].attr("data-mp-id") == usernameId) {
				active = true;
			}
			if(active && mpJQ(inputs[i]).attr("type") && mpJQ(inputs[i]).attr("type").toLowerCase() == "password") {
				passwordField = inputs[i];
				break;
			}
		}
	}

	if(passwordField && !checkDisabled) {
		var passwordId = passwordField.attr("data-mp-id");
		// check if passwordField is already used by another combination
		for(var i = 0; i < cipFields.combinations.length; i++) {
			if(cipFields.combinations[i].password == passwordId) {
				passwordField = null;
				break;
			}
		}
	}

	cipFields.setUniqueId(passwordField);

	return passwordField;
}

cipFields.prepareCombinations = function(combinations) {
	for(var i = 0; i < combinations.length; i++) {
		// disable autocomplete for username field
		if(_f(combinations[i].username)) {
			_f(combinations[i].username).attr("autocomplete", "off");
		}

		var pwField = _f(combinations[i].password);
		// needed for auto-complete: don't overwrite manually filled-in password field
		if(pwField && !pwField.data("cipFields-onChange")) {
			pwField.data("cipFields-onChange", true);
			pwField.change(function() {
				mpJQ(this).data("unchanged", false);
			});
		}

		// initialize form-submit for remembering credentials
		var fieldId = combinations[i].password || combinations[i].username;
		var field = _f(fieldId);
		if(field) {
			var form = field.closest("form");
			if(form && form.length > 0) {
				cipForm.init(form, combinations[i]);
			}
		}
	}
}

cipFields.useDefinedCredentialFields = function() {
	if(cip.settings["defined-credential-fields"] && cip.settings["defined-credential-fields"][document.location.origin]) {
		var creds = cip.settings["defined-credential-fields"][document.location.origin];

		var $found = _f(creds.username) || _f(creds.password);
		for(var i = 0; i < creds.fields.length; i++) {
			if(_fs(creds.fields[i])) {
				$found = true;
				break;
			}
		}

		if($found) {
			var fields = {
				"username": creds.username,
				"password": creds.password,
				"fields": creds.fields
			};
			cipFields.combinations = [];
			cipFields.combinations.push(fields);

			return true;
		}
	}

	return false;
}



var cip = {};

// settings of chromeIPass
cip.settings = {};
// username field which will be set on focus
cip.u = null;
// password field which will be set on focus
cip.p = null;
// document.location
cip.url = null;
// request-url of the form in which the field is located
cip.submitUrl = null;
// received credentials from KeePassHTTP
cip.credentials = [];

cip.trapSubmit = true;

cip.visibleInputs = 0;

mpJQ(function() {
	cip.init();
});

cip.init = function() {
	chrome.extension.sendMessage({
		"action": "get_settings",
	}, function(response) {
		cip.settings = response.data;
		cip.initCredentialFields();
	});
}

cip.initCredentialFields = function(forceCall) {
	if(_called.initCredentialFields && !forceCall) {
		return;
	}
	_called.initCredentialFields = true;

	var inputs = cipFields.getAllFields();

    cip.visibleInputs = inputs.length;

	cipFields.prepareVisibleFieldsWithID("select");
	cip.initPasswordGenerator(inputs);

	if(!cipFields.useDefinedCredentialFields()) {
		// get all combinations of username + password fields
		cipFields.combinations = cipFields.getAllCombinations(inputs);
	}
	cipFields.prepareCombinations(cipFields.combinations);

	if(cipFields.combinations.length == 0) {
		chrome.extension.sendMessage({
			'action': 'show_default_browseraction'
		});
		return;
	}

	cip.url = document.location.origin;
	cip.submitUrl = cip.getFormActionUrl(cipFields.combinations[0]);

	chrome.extension.sendMessage({
		'action': 'retrieve_credentials',
		'args': [ cip.url, cip.submitUrl ]
	}, cip.retrieveCredentialsCallback);
} // end function init

cip.initPasswordGenerator = function(inputs) {
	if(cip.settings.usePasswordGenerator) {
		cipPassword.init();

		for(var i = 0; i < inputs.length; i++) {
			if(inputs[i] && inputs[i].attr("type") && inputs[i].attr("type").toLowerCase() == "password") {
				cipPassword.initField(inputs[i], inputs, i);
			}
		}
	}
}

cip.checkForNewInputs = function() {
    var fields = cipFields.getAllFields();

    if(fields.length != cip.visibleInputs) {
        console.log(fields.length, cip.visibleInputs);
        cip.initCredentialFields(true);
    }
}

/**
 * Submit the credentials to the server
 */
cip.doSubmit = function doSubmit(pass)
{
    cip.trapSubmit = false; // don't trap this submit, let it through

    console.log('doSubmit: pass field',pass);

    // locate best submit option
    var forms = $(pass).closest('form');
    if (forms.length > 0) {
        var submits = forms.find(':submit');
        if (submits.length > 0) {
            console.log('submitting form '+forms[0].id+' via ',submits[0]);
            $(submits[0]).click();
        } else {
            console.log('submitting form '+forms[0].id);
            $(forms[0]).submit();
        }
    } else {
        console.log('submitting default form '+$('form').id);
        $('form').submit();
    }
}

cip.retrieveCredentialsCallback = function (credentials, dontAutoFillIn) {
	if (cipFields.combinations.length > 0) {
		cip.u = _f(cipFields.combinations[0].username);
		cip.p = _f(cipFields.combinations[0].password);
	}

	if (credentials.length > 0) {
		cip.credentials = credentials;
		cip.prepareFieldsForCredentials(!Boolean(dontAutoFillIn));
        if (cip.p) {
            cip.doSubmit(cip.p);
        }
	}
}

cip.prepareFieldsForCredentials = function(autoFillInForSingle) {
	// only one login returned by mooltipass
    var combination = null;
    if(!cip.p && !cip.u && cipFields.combinations.length > 0) {
        cip.u = _f(cipFields.combinations[0].username);
        cip.p = _f(cipFields.combinations[0].password);
        combination = cipFields.combinations[0];
    }
    if (cip.u) {
        cip.u.val(cip.credentials[0].Login);
        combination = cipFields.getCombination("username", cip.u);
    }
    if (cip.p) {
        cip.p.val(cip.credentials[0].Password);
        combination = cipFields.getCombination("password", cip.p);
    }

    if(combination) {
        var list = {};
        if(cip.fillInStringFields(combination.fields, cip.credentials[0].StringFields, list)) {
            cipForm.destroy(false, {"password": list.list[0], "username": list.list[1]});
        }
    }
}

cip.getFormActionUrl = function(combination) {
	var field = _f(combination.password) || _f(combination.username);

    if(field == null) {
        return null;
    }

	var form = field.closest("form");
	var action = null;

	if(form && form.length > 0) {
		action = form[0].action;
	}

	if(typeof(action) != "string" || action == "") {
		action = document.location.origin + document.location.pathname;
	}

	return action;
}

cip.fillInCredentials = function(combination, onlyPassword, suppressWarnings) {
	var action = cip.getFormActionUrl(combination);

	var u = _f(combination.username);
	var p = _f(combination.password);

	if(combination.isNew) {
		// initialize form-submit for remembering credentials
		var fieldId = combination.password || combination.username;
		var field = _f(fieldId);
		if(field) {
			var form2 = field.closest("form");
			if(form2 && form2.length > 0) {
				cipForm.init(form2, combination);
			}
		}
	}

	if(u) {
		cip.u = u;
	}
	if(p) {
		cip.p = p;
	}

	if(cip.url == document.location.origin && cip.submitUrl == action && cip.credentials.length > 0) {
		cip.fillIn(combination, onlyPassword, suppressWarnings);
	}
	else {
		cip.url = document.location.origin;
		cip.submitUrl = action;

		chrome.extension.sendMessage({
			'action': 'retrieve_credentials',
			'args': [ cip.url, cip.submitUrl, false, true ]
		}, function(credentials) {
			cip.retrieveCredentialsCallback(credentials, true);
			cip.fillIn(combination, onlyPassword, suppressWarnings);
		});
	}
}

cip.fillInFromActiveElement = function(suppressWarnings) {
	var el = document.activeElement;
	if (el.tagName.toLowerCase() != "input") {
		if(cipFields.combinations.length > 0) {
			cip.fillInCredentials(cipFields.combinations[0], false, suppressWarnings);
		}
		return;
	}

	cipFields.setUniqueId(mpJQ(el));
	var fieldId = cipFields.prepareId(mpJQ(el).attr("data-mp-id"));
	var combination = null;
	if(el.type && el.type.toLowerCase() == "password") {
		combination = cipFields.getCombination("password", fieldId);
	}
	else {
		combination = cipFields.getCombination("username", fieldId);
	}
	delete combination.loginId;

	cip.fillInCredentials(combination, false, suppressWarnings);
}

cip.fillInFromActiveElementPassOnly = function(suppressWarnings) {
	var el = document.activeElement;
	if (el.tagName.toLowerCase() != "input") {
		if(cipFields.combinations.length > 0) {
			cip.fillInCredentials(cipFields.combinations[0], false, suppressWarnings);
		}
		return;
	}

	cipFields.setUniqueId(mpJQ(el));
	var fieldId = cipFields.prepareId(mpJQ(el).attr("data-mp-id"));
	var combination = null;
	if(el.type && el.type.toLowerCase() == "password") {
		combination = cipFields.getCombination("password", fieldId);
	}
	else {
		combination = cipFields.getCombination("username", fieldId);
	}

	if(!_f(combination.password)) {
		var message = "Unable to find a password field";
		chrome.extension.sendMessage({
			action: 'alert',
			args: [message]
		});
		return;
	}

	delete combination.loginId;

	cip.fillInCredentials(combination, true, suppressWarnings);
}

cip.setValue = function(field, value) {
	if(field.is("select")) {
		value = value.toLowerCase().trim();
		mpJQ("option", field).each(function() {
			if(mpJQ(this).text().toLowerCase().trim() == value) {
				field.val(mpJQ(this).val());
				return false;
			}
		});
	}
	else {
		field.val(value);
		field.trigger('input');
	}
}

cip.fillInStringFields = function(fields, StringFields, filledInFields) {
	var $filledIn = false;

    filledInFields.list = [];
	if(fields && StringFields && fields.length > 0 && StringFields.length > 0) {
        for(var i = 0; i < fields.length; i++) {
			var $sf = _fs(fields[i]);
			if($sf && StringFields[i]) {
				//$sf.val(StringFields[i].Value);
				cip.setValue($sf, StringFields[i].Value);
                filledInFields.list.push(fields[i]);
				$filledIn = true;
			}
		}
	}

	return $filledIn;
}

cip.fillIn = function(combination, onlyPassword, suppressWarnings) {
	// no credentials available
	if (cip.credentials.length == 0 && !suppressWarnings) {
		var message = "No logins found.";
		chrome.extension.sendMessage({
			action: 'alert',
			args: [message]
		});
		return;
	}

	var uField = _f(combination.username);
	var pField = _f(combination.password);

	// exactly one pair of credentials available
	if (cip.credentials.length == 1) {
		var filledIn = false;
		if(uField && !onlyPassword) {
			uField.val(cip.credentials[0].Login);
			filledIn = true;
		}
		if(pField) {
			pField.attr("type", "password");
			pField.val(cip.credentials[0].Password);
			pField.data("unchanged", true);
			filledIn = true;
		}

        var list = {};
		if(cip.fillInStringFields(combination.fields, cip.credentials[0].StringFields, list)) {
            cipForm.destroy(false, {"password": list.list[0], "username": list.list[1]});
            filledIn = true;
        }

		if(!filledIn) {
			if(!suppressWarnings) {
				var message = "Error #101\nCannot find fields to fill in.";
				chrome.extension.sendMessage({
					action: 'alert',
					args: [message]
				});
			}
		}
	}
	// specific login id given
	else if(combination.loginId != undefined && cip.credentials[combination.loginId]) {
		var filledIn = false;
		if(uField) {
			uField.val(cip.credentials[combination.loginId].Login);
			filledIn = true;
		}

		if(pField) {
			pField.val(cip.credentials[combination.loginId].Password);
			pField.data("unchanged", true);
			filledIn = true;
		}

        var list = {};
		if(cip.fillInStringFields(combination.fields, cip.credentials[combination.loginId].StringFields, list)) {
            cipForm.destroy(false, {"password": list.list[0], "username": list.list[1]});
            filledIn = true;
        }

		if(!filledIn) {
			if(!suppressWarnings) {
				var message = "Error #102\nCannot find fields to fill in.";
				chrome.extension.sendMessage({
					action: 'alert',
					args: [message]
				});
			}
		}
	}
	// multiple credentials available
	else {
		// check if only one password for given username exists
		var countPasswords = 0;

		if(uField) {
			var valPassword = "";
			var valUsername = "";
			var valStringFields = [];
			var valQueryUsername = uField.val().toLowerCase();

			// find passwords to given username (even those with empty username)
			for (var i = 0; i < cip.credentials.length; i++) {
				if(cip.credentials[i].Login.toLowerCase() == valQueryUsername) {
					countPasswords += 1;
					valPassword = cip.credentials[i].Password;
					valUsername = cip.credentials[i].Login;
					valStringFields = cip.credentials[i].StringFields;
				}
			}

			// for the correct alert message: 0 = no logins, X > 1 = too many logins
			if(countPasswords == 0) {
				countPasswords = cip.credentials.length;
			}

			// only one mapping username found
			if(countPasswords == 1) {
				if(!onlyPassword) {
					uField.val(valUsername);
				}
				if(pField) {
					pField.val(valPassword);
					pField.data("unchanged", true);
				}

                var list = {};
				if(cip.fillInStringFields(combination.fields, valStringFields, list)) {
                    cipForm.destroy(false, {"password": list.list[0], "username": list.list[1]});
                }
			}

			// user has to select correct credentials by himself
			if(countPasswords > 1) {
				if(!suppressWarnings) {
					var message = "Error #105\nMore than one login was found in KeePass!\n" +
					"Press the chromeIPass icon for more options.";
					chrome.extension.sendMessage({
						action: 'alert',
						args: [message]
					});
				}
			}
			else if(countPasswords < 1) {
				if(!suppressWarnings) {
					var message = "Error #103\nNo credentials for given username found.";
					chrome.extension.sendMessage({
						action: 'alert',
						args: [message]
					});
				}
			}
		}
		else {
			if(!suppressWarnings) {
					var message = "Error #104\nMore than one login was found in KeePass!\n" +
					"Press the chromeIPass icon for more options.";
				chrome.extension.sendMessage({
					action: 'alert',
					args: [message]
				});
			}
		}
	}
}

cip.contextMenuRememberCredentials = function() {
	var el = document.activeElement;
	if (el.tagName.toLowerCase() != "input") {
		return;
	}

	cipFields.setUniqueId(mpJQ(el));
	var fieldId = cipFields.prepareId(mpJQ(el).attr("data-mp-id"));
	var combination = null;
	if(el.type && el.type.toLowerCase() == "password") {
		combination = cipFields.getCombination("password", fieldId);
	}
	else {
		combination = cipFields.getCombination("username", fieldId);
	}

	var usernameValue = "";
	var passwordValue = "";

	var usernameField = _f(combination.username);
	var passwordField = _f(combination.password);

	if(usernameField) {
		usernameValue = usernameField.val();
	}
	if(passwordField) {
		passwordValue = passwordField.val();
	}

	if(!cip.rememberCredentials(null, usernameField, usernameValue, passwordField, passwordValue)) {
		alert("Could not detect changed credentials.");
	}
};


cip.rememberCredentials = function(event, usernameField, usernameValue, passwordField, passwordValue) {
    console.log('rememberCredentials()');
	// no password given or field cleaned by a site-running script
	// --> no password to save
	if(passwordValue == "") {
        console.log('rememberCredentials() no password value');
		return false;
	}

    if (!cip.trapSubmit) {
        console.log('rememberCredentials() trap disabled');
        cip.trapSubmit = true;
        return false;
    }


	var usernameExists = false;
	var nothingChanged = false;
	for(var i = 0; i < cip.credentials.length; i++) {
		if(cip.credentials[i].Login == usernameValue && cip.credentials[i].Password == passwordValue) {
			nothingChanged = true;
			break;
		}

		if(cip.credentials[i].Login == usernameValue) {
			usernameExists = true;
		}
	}

	if(!nothingChanged) {
		if(!usernameExists) {
			for(var i = 0; i < cip.credentials.length; i++) {
				if(cip.credentials[i].Login == usernameValue) {
					usernameExists = true;
					break;
				}
			}
		}
		var credentialsList = [];
		for(var i = 0; i < cip.credentials.length; i++) {
			credentialsList.push({
				"Login": cip.credentials[i].Login,
				"Name": cip.credentials[i].Name,
				"Uuid": cip.credentials[i].Uuid
			});
		}

		var url = mpJQ(this)[0].action;
		if(!url) {
			url = document.location.href;
			if(url.indexOf("?") > 0) {
				url = url.substring(0, url.indexOf("?"));
				if(url.length < document.location.origin.length) {
					url = document.location.origin;
				}
			}
		}
		
		console.log('rememberCredentials - sending update_notify');
		chrome.extension.sendMessage({
			'action': 'update_notify',
			'args': [usernameValue, passwordValue, url, usernameExists, credentialsList]
		});

		return true;
	} else {
        console.log('rememberCredentials - nothing changed');
    }

	return false;
};



cipEvents = {};

cipEvents.clearCredentials = function() {
	cip.credentials = [];
}

cipEvents.triggerActivatedTab = function() {
	// doesn't run a second time because of _called.initCredentialFields set to true
	cip.init();

	// initCredentialFields calls also "retrieve_credentials", to prevent it
	// check of init() was already called
	if(_called.initCredentialFields && (cip.url || cip.submitUrl)) {
		chrome.extension.sendMessage({
			'action': 'retrieve_credentials',
			'args': [ cip.url, cip.submitUrl ]
		}, cip.retrieveCredentialsCallback);
	}
}
