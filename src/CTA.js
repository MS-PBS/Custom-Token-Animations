class CTArender {
    /**
     * flagData = {
                name: name,
                textureData: this.textureData,
                id: this.flagId
            }
     * @param {*} token 
     * @param {*} flagData 
     */
    static async RenderAnim(tokenID, flagData, duplicate) {
        if (duplicate) { await CTArender.DeleteSpecificAnim, tokenID, duplicate.id }
        let token = canvas.tokens.get(tokenID)
        let { textureData, name, id } = flagData;
        let { texturePath, scale, speed, multiple, rotation, xScale, yScale, belowToken, radius, opacity, tint, equip, lock } = textureData

        let CTAtexture = await loadTexture(texturePath)
        const textureSize = token.data.height * canvas.grid.size;
        var container;
        if (typeof scale === "number") {
            scale = [`${scale}`, `${scale}`];
        }
        else {
            scale = scale.split(",")
            if (scale.length === 1) scale[1] = scale[0]
        }
        if (equip) {
            container = token.children.find(i => i.isSprite && i.texture.baseTexture?.imageUrl?.includes(token.data.img))
            container.CTAcontainer = true
            CTAtexture.orig = { height: textureSize * parseFloat(scale[1]) / container.scale.x, width: textureSize * parseFloat(scale[0]) / container.scale.y, x: -textureSize, y: -textureSize }
        }
        else {
            container = token
            CTAtexture.orig = { height: textureSize * parseFloat(scale[1]), width: textureSize * parseFloat(scale[0]), x: -textureSize, y: -textureSize }
        }
        if (rotation === "rotation") {
            token.sortableChildren = true
            for (let i = 0; i <= multiple - 1; i++) {
                let sprite = new PIXI.Sprite(CTAtexture)
                //sprite.anchor.set(0.5)
                sprite.anchor.set(radius)
                sprite.pivot.set(textureSize / 2)
                sprite.position.set(textureSize / 2)
                let icon = await token.addChild(sprite)
                await icon.position.set(token.data.width * canvas.grid.w * xScale, token.data.height * canvas.grid.h * yScale)
                const source = getProperty(icon._texture, "baseTexture.resource.source")
                if (source && (source.tagName === "VIDEO")) {
                    source.loop = true;
                    source.muted = true;
                    game.video.play(source);
                }
                icon.CTA = true;
                icon.CTAid = flagData.id;
                icon.CTAlock = lock;
                icon.alpha = opacity;
                icon.tint = tint;
                if (belowToken) { icon.zIndex = -1 }
                else { icon.zIndex = 1000 }
                icon.angle = i * (360 / multiple)
                let tween = TweenMax.to(icon, speed, { angle: (360 + icon.angle), repeat: -1, ease: Linear.easeNone });
            }
        }
        if (rotation === "static") {
            token.sortableChildren = true
            let sprite = new PIXI.Sprite(CTAtexture)
            sprite.anchor.set(0.5)
            let icon = await container.addChild(sprite)
            if (!equip) {
                await icon.position.set(token.data.width * canvas.grid.w * xScale, token.data.height * canvas.grid.h * yScale)
            } else {
                let xPos = container.texture.width * xScale - (container.texture.width / 2)
                let yPos = container.texture.height * yScale - (container.texture.height / 2)
                await icon.position.set(xPos, yPos)
            }
            const source = getProperty(icon._texture, "baseTexture.resource.source")
            if (source && (source.tagName === "VIDEO")) {
                source.loop = true;
                source.muted = true;
                game.video.play(source);
            }
            icon.CTA = true
            icon.CTAid = flagData.id;
            icon.CTAlock = lock;
            icon.alpha = opacity;
            icon.tint = tint;
            icon.angle = token.data.rotation
            if (belowToken) { icon.zIndex = -1 }
            else { icon.zIndex = 1000 }
        }

    }

    /**
     * 
     * @param {Object} token 
     * @param {String} id 
     */
    static async FadeAnim(tokenID, id) {
        let token = canvas.tokens.get(tokenID)
        let icon = token.children?.filter(c => c.CTAid === id)
        TweenMax.to(icon, 2, { alpha: 0, onComplete: CTArender.DeleteSpecificAnim, onCompleteParams: [tokenID, id] })
    }

    /**
     * 
     * @param {Object} token 
     * @param {String} id 
     */
    static DeleteSpecificAnim(tokenID, id) {
        let token = canvas.tokens.get(tokenID)
        let icons = token.children?.filter(c => c.CTAid === id)
        for (let icon of icons) {
            TweenMax.killTweensOf(icon)
            icon.destroy()
        }
        return true;
    }
}

export class CTA {

    static ready() {

        Hooks.on("canvasInit", async () => {
            Hooks.once("canvasPan", () => {
                CTA.AddTweens()
            })
        });
        Hooks.on("preDeleteToken", (scene, token) => {
            let deleteToken = canvas.tokens.get(token._id)
            if (!deleteToken) return;
            TweenMax.killTweensOf(deleteToken.children)
        });
        Hooks.on("createToken", (scene, token) => {
            let tokenInstance = canvas.tokens.get(token._id)
            if (!tokenInstance) return;
            let flags = tokenInstance.getFlag(MODULE_NAME, "anim") ? tokenInstance.getFlag(MODULE_NAME, "anim") : []
            if (flags) CTA.AddTweens(tokenInstance)
        });
        Hooks.on("preUpdateToken", async (_scene, token, update) => {
            if ("height" in update || "width" in update) {
                let fullToken = canvas.tokens.get(token._id)
                let CTAtweens = fullToken.children.filter(c => c.CTA === true)
                for (let child of CTAtweens) {
                    TweenMax.killTweensOf(child)
                    child.destroy()
                }
            }
        })
        Hooks.on("updateToken", (_scene, token, update) => {
            if ("height" in update || "width" in update || "img" in update) {
                let fullToken = canvas.tokens.get(token._id)
                CTA.AddTweens(fullToken)
            }
        })

    }

    static AddTweens(token) {
        let testArray = []
        if (token) testArray.push(token)
        else testArray = canvas.tokens.placeables
        for (let testToken of testArray) {
            let tokenFlags = testToken.getFlag(MODULE_NAME, "anim") || []
            let actorFlags = getProperty(testToken.actor.data, "token.flags.Custom-Token-Animations.anim") || []
            let totalFlags = tokenFlags.concat(actorFlags)
            let newFlag = totalFlags.reduce((map, obj) => map.set(obj.id, obj), new Map()).values()
            if (!newFlag) continue;
            Array.from(newFlag).forEach(f => {
                CTArender.RenderAnim(testToken.id, f)
            })
        }
    }

    /**
         * Does given token have an animation of given name
         * @param {Object <token5e>} token 
         * @param {String} name 
         */
    static hasAnim(token, name) {
        let anims = token.getFlag(MODULE_NAME, "anim")
        if (!anims) return false;
        for (let testAnim of anims) {
            if (testAnim.name === name) return true;
        }
        return false;
    }


    static addAnimation(token, textureData, pushActor, name, oldID) {
        if (typeof token === "string") token = canvas.tokens.get(token)
        if (!game.user.isGM) {
            CTAsocket.executeAsGM("addAnimation", token.id, textureData, pushActor, name, oldID)
            return;
        }
        let flagId = oldID || randomID()
        let flagData = {
            name: name,
            textureData: textureData,
            id: flagId
        }
        CTA.PushFlags(token, flagData, pushActor)
    }

    static async removeAnim(token, animId, actorRemoval, fadeOut) {
        if (typeof token === "string") token = canvas.tokens.get(token)
        if (!game.user.isGM) {
            CTAsocket.executeAsGM("removeById", token.id, animId, actorRemoval, fadeOut);
            return;
        }
        let tokenFlags = Array.from(token.getFlag(MODULE_NAME, "anim") || [])
        let actorFlags = Array.from(getProperty(token, "actor.data.token.flags.Custom-Token-Animations.anim") || [])

        let tokenAnimRemove = tokenFlags.findIndex(i => i.id === animId)
        tokenFlags.splice(tokenAnimRemove, 1)
        await token.update({ "flags.Custom-Token-Animations": tokenFlags })
        if (actorRemoval) {
            let actorAnimRemove = actorFlags.findIndex(i => i.id === animId)
            actorFlags.splice(actorAnimRemove, 1)
            await token.actor.update({ "token.flags.Custom-Token-Animations.anim": actorFlags })
        }
        let fade = fadeOut || game.settings.get(MODULE_NAME, "fadeOut")

        if (fade) {
            CTAsocket.executeForEveryone("fadeOut", token.id, animId)
        }
        else {
            CTAsocket.executeForEveryone("deleteSpecific", token.id, animId)
        }
    }

    static removeAnimByName(token, animName, actorRemoval, fadeOut) {
        if (typeof token === "string") token = canvas.tokens.get(token)
        if (!game.user.isGM) {
            CTAsocket.executeAsGM("removeByName", token.id, animName, actorRemoval, fadeOut);
            return;
        }
        let tokenFlags = Array.from(token.getFlag(MODULE_NAME, "anim") || [])
        let removedAnim = tokenFlags.find(i => i.name === animName)
        CTA.removeAnim(token.id, removedAnim.id, actorRemoval, fadeOut)
    }


    /**
     * 
     * @param {*} token 
     * @param {*} flagData {name : effectName, textureData: textureData, id : id}
     * @param {*} pushActor 
     */
    static async PushFlags(token, flagData, pushActor) {
        if (!game.user.isGM) return;
        let tokenFlags = Array.from(token.getFlag(MODULE_NAME, "anim") || [])
        let actorFlags = Array.from(getProperty(token, "actor.data.token.flags.Custom-Token-Animations.anim") || [])

        let tokenDuplicate = tokenFlags.find(f => f.name === flagData.name)
        if (tokenDuplicate) {
            let index = tokenFlags.indexOf(tokenDuplicate)
            if (index > -1) {
                tokenFlags.splice(index, 1)
            }
            CTAsocket.executeForEveryone("deleteSpecific", token.id, tokenDuplicate.id)
        }
        tokenFlags.push(flagData)
        await token.update({ "flags.Custom-Token-Animations.anim": tokenFlags })

        if (pushActor) {
            let actorDuplicate = actorFlags.find(f => f.name === flagData.name)
            if (actorDuplicate) {
                let index = actorFlags.indexOf(actorDuplicate)
                if (index > -1) {
                    actorFlags.splice(index, 1)
                }
            }
            actorFlags.push(flagData)
            await token.actor.update({ "token.flags.Custom-Token-Animations.anim": actorFlags })
        }
        CTAsocket.executeForEveryone("renderAnim", token.id, flagData)
    }

    /**
   * 
   * @param {String} OGpath original texture path
   * @param {Object} token Token to apply to
   * @param {Object} oldData Previous effect data, used in update pathway
   * @param {String} name name of the effect
   * @returns 
   */
    static async animationDialog(OGpath, token, oldData, name) {
        if (canvas.tokens.controlled > 1 && !token) {
            ui.notifications.error(game.i18n.format("CTA.TokenError"));
            return;
        }
        if (!OGpath) OGpath = oldData.texturePath
        function shortLeft(string, boxLength) {
            let PREFIXDIRSTR = "...";
            boxLength += PREFIXDIRSTR.length;
            let splitString = string.substring(((string.length - 1) - boxLength), (string.length));
            splitString = PREFIXDIRSTR + splitString;
            return splitString;
        }
        let actorFlags = getProperty(token, "actor.data.token.flags.Custom-Token-Animations.anim") || []
        let animFlag = !!actorFlags.find(i => i.name === name)
        if (!token) token = canvas.tokens.controlled[0]
        let hexColour = oldData?.tint?.toString(16).padStart(6, '0').toUpperCase() || "FFFFFF"
        let oldX = typeof oldData?.xScale === "number" ? oldData.xScale : 0.5
        let oldY = typeof oldData?.yScale === "number" ? oldData.yScale : 0.5

        let content = `
        <style> 
        .pickDialog .form-group {
            clear: both;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            margin: 3px 0;
            align-items: center;
        }
        .pickDialog label span {
            display: block;
        }

        </style>
    <form class="pickDialog">
        <div class="form-group">
            <label for="name">${game.i18n.format("Name")}: </label>
            <input id="name" name="name" type="text" value= "${name || ""}"></input>
        </div>
        <div class="form-group">
            <label for="path">${game.i18n.format("CTA.ImagePath")}: </label>
            <input id="path" name="path" type="text" value= "${shortLeft(OGpath, 20)}" required></input>
        </div>
        <div class="form-group">
            <label for="scale"><span>${game.i18n.format("Scale")}:</span>
            <span class="units">${game.i18n.format("CTA.ImageScale")}</span></label>
            <input id="scale" name="scale" type="text" value= "${oldData?.scale || "1"}" required></input>
        </div>
        <div class="form-group">
            <label for="rotation"><span>${game.i18n.format("CTA.StaticImage")}:</span>
            <span class="units">${game.i18n.format("CTA.StaticImage_hint")}</span> </label>
            <input id="rotation" name="rotation" type="checkbox" ${oldData?.rotation === "static" ? 'checked' : ''} ></input>
        </div>
        <div class="form-group">
            <label for="speed"><span>${game.i18n.format("CTA.SpeedOfRotation")}:</span>
            <span class="units">${game.i18n.format("CTA.SpeedOfRotation_hint")}</span></label>
            <input id="speed" name="speed" type="number" step="0.1" value= "${oldData?.speed || 0}" ${oldData?.rotation === "static" ? 'disabled' : ''}></input>
        </div>
        <div class="form-group">
            <label for="radius"><span>${game.i18n.format("CTA.RadiusOfRotation")}:</span>
            <span class="units">${game.i18n.format("CTA.RadiusOfRotation_hint")}</span> </label>
            <input id="radius" name="radius" type="number" step="0.1"  value= "${oldData?.radius / 2 || 1}" ${oldData?.rotation === "static" ? 'disabled' : ''}></input>
        </div>
        <div class="form-group">
            <label for="multiple">${game.i18n.format("CTA.NumberOfCopies")}:</label>
            <input id="multiple" name="multiple" type="number" min="1" value= "${oldData?.multiple || 1}" ${oldData?.rotation === "static" ? 'disabled' : ''}></input>
        </div>
        <div class="form-group">
            <label for="xScale"><span>${game.i18n.format("CTA.PositionXScale")}:</span>
            <span class="units">${game.i18n.format("CTA.PositionXScale_hint")}</span> </label>
            <input id="xScale" name="xScale" type="number" value= "${oldX}" required></input>
        </div>
        <div class="form-group">
            <label for="yScale"><span>${game.i18n.format("CTA.PositionYScale")}:</span>
            <span class="units">${game.i18n.format("CTA.PositionYScale_hint")}</span> </label>
            <input id="yScale" name="yScale" type="number" value= "${oldY}" required></input>
        </div>
        <div class="form-group">
            <label for="opacity">${game.i18n.format("CTA.AssetOpacity")}:</label>
            <input id="opacity" name="opacity" type="number" min="0" max="1" value= "${oldData?.opacity || 1}" required></input>
        </div>
        <div class="form-group">
            <label for="tint">${game.i18n.format("CTA.AssetTint")}:</label>
            <input type="color" id="tint" name="tint" value="#${hexColour || "FFFFFF"}">
        </div>
        <div class="form-group">
            <label for="belowToken"><span>${game.i18n.format("CTA.RenderBelow")}:</span>
            <span class="units">${game.i18n.format("CTA.RenderBelow_hint")}</label>
            <input id="belowToken" name="belowToken" type="checkbox" ${oldData?.belowToken === true ? 'checked' : ''}></input>
        </div>
        <div class="form-group">
            <label for="pushActor"><span>${game.i18n.format("CTA.PermanentActor")}:</span>
            <span class="units">${game.i18n.format("CTA.PermanentActor_hint")}</label>
            <input id="pushActor" name="pushActor" type="checkbox" ${animFlag === true ? 'checked' : ''}></input>
        </div>
        <div class="form-group">
            <label for="equip"><span>${game.i18n.format("CTA.ApplyEquipment")}:</span>
            <span class="units">${game.i18n.format("CTA.ApplyEquipment_hint")}</span> </label>
            <input id="equip" name="equip" type="checkbox" ${oldData?.equip === true ? 'checked' : ''}></input>
        </div>
        <div class="form-group">
            <label for="lock"><span>${game.i18n.format("CTA.NoRotation")}:</span>
            <span class="units">${game.i18n.format("CTA.NoRotation_hint")}</span> </label>
            <input id="lock" name="lock" type="checkbox" ${oldData?.lock === true ? 'checked' : ''}></input>
        </div>
    </form>
        `

        let dialog = await new Dialog({

            title: game.i18n.format("CTA.PickEffects"),
            content: content,
            buttons: {
                one: {
                    label: game.i18n.format("CTA.Create"),
                    callback: (html) => {
                        let path = OGpath ? OGpath : html.find("#path")[0].value
                        let name = html.find("#name")[0].value
                        let scale = html.find("#scale")[0].value
                        let speed = Number(html.find("#speed")[0].value)
                        let rotation = html.find("#rotation")[0].checked ? "static" : "rotation"
                        let pushActor = html.find("#pushActor")[0].checked
                        let multiple = Number(html.find("#multiple")[0].value)
                        let xScale = Number(html.find("#xScale")[0].value)
                        let yScale = Number(html.find("#yScale")[0].value)
                        let opacity = Number(html.find("#opacity")[0].value)
                        let tint = parseInt(html.find("#tint")[0].value.substr(1), 16)
                        let belowToken = html.find("#belowToken")[0].checked
                        let radius = Number(html.find("#radius")[0].value) * 2
                        let equip = html.find("#equip")[0].checked
                        let lock = html.find("#lock")[0].checked
                        let textureData = {
                            texturePath: path,
                            scale: scale,
                            speed: speed,
                            multiple: multiple,
                            rotation: rotation,
                            xScale: xScale,
                            yScale: yScale,
                            opacity: opacity,
                            tint: tint,
                            belowToken: belowToken,
                            radius: radius,
                            equip: equip,
                            lock: lock
                        }
                        CTA.addAnimation(token, textureData, pushActor, name)
                    }
                },
                two: {
                    label: game.i18n.format("CTA.RePick"),
                    callback: (html) => {
                        let path = OGpath ? OGpath : html.find("#path")[0].value
                        let name = html.find("#name")[0].value
                        let scale = html.find("#scale")[0].value
                        let speed = Number(html.find("#speed")[0].value)
                        let rotation = html.find("#rotation")[0].checked ? "static" : "rotation"
                        let pushActor = html.find("#pushActor")[0].checked
                        let multiple = Number(html.find("#multiple")[0].value)
                        let xScale = Number(html.find("#xScale")[0].value)
                        let yScale = Number(html.find("#yScale")[0].value)
                        let opacity = Number(html.find("#opacity")[0].value)
                        let tint = parseInt(html.find("#tint")[0].value.substr(1), 16)
                        let belowToken = html.find("#belowToken")[0].checked
                        let radius = Number(html.find("#radius")[0].value) * 2
                        let equip = html.find("#equip")[0].checked
                        let lock = html.find("#lock")[0].checked
                        let oldData = {
                            texturePath: path,
                            scale: scale,
                            speed: speed,
                            multiple: multiple,
                            rotation: rotation,
                            xScale: xScale,
                            yScale: yScale,
                            opacity: opacity,
                            tint: tint,
                            belowToken: belowToken,
                            radius: radius,
                            equip: equip,
                            lock: lock
                        }
                        CTA.pickEffect(token, oldData)
                    }
                }
            }
        })._render(true)


        $('.form-group #rotation').change(function () {
            if ($(this).is(':checked')) {
                $('.pickDialog #multiple')[0].disabled = true
                $('.pickDialog #speed')[0].disabled = true
                $('.pickDialog #radius')[0].disabled = true
            }
            else {
                $('.pickDialog #multiple')[0].disabled = false
                $('.pickDialog #speed')[0].disabled = false
                $('.pickDialog #radius')[0].disabled = true
            }
        })

    }

    static async getAnims(token) {
        if (canvas.tokens.controlled.length !== 1) { ui.notifications.notify(game.i18n.format("CTA.TokenError")); return; }
        if (!token) token = canvas.tokens.controlled[0]
        let anims = await token.getFlag(MODULE_NAME, "anim")
        let content = ``;
        let allButtons = {
            one: {
                label: game.i18n.format("Update"),
                icon: `<i class="fas fa-edit"></i>`,
                callback: (html) => {
                    let animId = html.find("[name=anims]")[0].value;
                    let updateAnim = anims.find(i => i.id === animId)
                    CTA.animationDialog(undefined, token, updateAnim.textureData, updateAnim.name)
                }
            },
            two: {
                label: game.i18n.format("Delete"),
                icon: `<i class="fas fa-trash-alt"></i>`,
                callback: (html) => {
                    let updateAnim = html.find("[name=anims]")[0].value;

                    new Dialog({
                        title: game.i18n.format("CTA.Confirm"),
                        content: game.i18n.format("CTA.Confirm_Content"),
                        buttons: {
                            one: {
                                label: game.i18n.format("CTA.ActorDelete"),
                                icon: `<i class="fas fa-check"></i>`,
                                callback: () => {
                                    CTA.removeAnim(token, updateAnim, true, true)
                                }
                            },
                            two: {
                                label: game.i18n.format("CTA.TokenDelete"),
                                icon: `<i class="fas fa-check"></i>`,
                                callback: () => {
                                    CTA.removeAnim(token, updateAnim, false, true)
                                }
                            },
                            three: {
                                label: game.i18n.format("CTA.Return"),
                                icon: `<i class="fas fa-undo-alt"></i>`,
                                callback: () => {
                                    CTA.getAnims(token)
                                }
                            }
                        }
                    }).render(true)
                }
            },
            three: {
                label: game.i18n.format("CTA.Replicate"),
                icon: `<i class="fas fa-file-import"></i>`,
                callback: (html) => {
                    let animId = html.find("[name=anims]")[0].value;
                    let updateAnim = anims.find(i => i.id === animId)
                    CTA.generateMacro(updateAnim)
                }
            },
            four: {
                label: game.i18n.format("CTA.AddNew"),
                icon: `<i class="fas fa-plus"></i>`,
                callback: () => {
                    CTA.pickEffect(token)
                }
            }
        }
        let addButton = {
            one: {
                label: game.i18n.format("CTA.AddNew"),
                icon: `<i class="fas fa-plus"></i>`,
                callback: () => {
                    CTA.pickEffect(token)
                }
            }
        }
        if (anims && anims.length > 0) {
            content = `<div class="form group">
                            <label>${game.i18n.format("CTA.Animations")}:</label>
                            <div><select name="anims">${anims.reduce((acc, anim) => acc += `<option value = ${anim.id}>${anim.name}</option>`, '')}</select></div>
                        </div>`;
            addButton = allButtons
        };
        new Dialog({
            title: game.i18n.format("CTA.AnimationPicker"),
            content: content,
            buttons: addButton
        }).render(true)
    }

    // Add button to sidebar
    static getSceneControlButtons(buttons) {
        if (!game.modules.get("socketlib")?.active) {
            ui.notifications.error(game.i18n.format("CTA.SocketLib_warn"))
            return;
        }
        let tokenButton = buttons.find(b => b.name == "token")
        let playerPermissions = game.settings.get(MODULE_NAME, "playerPermissions") === true ? true : game.user.isGM
        if (tokenButton) {
            tokenButton.tools.push({
                name: "cta-anim",
                title: game.i18n.format("CTA.AddAnimation"),
                icon: "fas fa-spinner",
                visible: playerPermissions,
                onClick: () => CTA.getAnims(),
                button: true
            });
        }
    }

    /**
     * Create a macro from selected effect data
     * @param {Object} oldData Data to transform into a macro
     */
    static generateMacro(oldData) {
        let data = duplicate(oldData)
        let image = data.textureData.texturePath.includes(".webm") ? "icons/svg/acid.svg" : data.textureData.texturePath
        let macroData = {
            command: `
            let textureData = {
                texturePath: "${data.textureData.texturePath}",
                scale: "${data.textureData.scale}",
                speed: ${data.textureData.speed},
                multiple: ${data.textureData.multiple},
                rotation: "${data.textureData.rotation}",
                xScale: ${data.textureData.xScale},
                yScale: ${data.textureData.yScale},
                belowToken: ${data.textureData.belowToken},
                radius: ${data.textureData.radius},
                opacity: ${data.textureData.opacity},
                tint: ${data.textureData.tint},
                equip: ${data.textureData.equip},
                lock : ${data.textureData.lock}
            }
            CTA.addAnimation(token, textureData, true, false, "${data.name}", false, null)
            `,
            img: image,
            name: `CTA ${data.name}`,
            scope: "global",
            type: "script"
        }
        Macro.create(macroData)
        ui.notifications.notify(game.i18n.format("CTA.MacroPrompt", { macroName: `CTA ${data.name}` }))
    }

    /**
     * Start the "full pathway"
     * @param {Object} token Token to apply too
     */
    static pickEffect(token, oldData) {
        let CTAPick = new FilePicker({
            type: "imagevideo",
            current: "",
            callback: path => {
                CTA.animationDialog(path, token, oldData)
            },

        })
        CTAPick.browse();
    }
}

export const MODULE_NAME = "Custom-Token-Animations";

Hooks.once("socketlib.ready", () => {
    let CTAsocket = socketlib.registerModule(MODULE_NAME);
    CTAsocket.register("renderAnim", CTArender.RenderAnim)
    CTAsocket.register("removeByName", CTA.removeAnimByName)
    CTAsocket.register("removeById", CTA.removeAnim)
    CTAsocket.register("addAnimation", CTA.addAnimation)
    CTAsocket.register("fadeOut", CTArender.FadeAnim)
    CTAsocket.register("deleteSpecific", CTArender.DeleteSpecificAnim)
})


Hooks.on("updateToken", (scene, token, update) => {
    if (!getProperty(update, "rotation")) return;
    let fullToken = canvas.tokens.get(token._id)
    let icons = fullToken.children.filter(i => i.CTA && !i.CTAlock)
    icons.forEach(i => i.angle = update.rotation)
})


Hooks.on('init', () => {
    game.settings.register(MODULE_NAME, "playerPermissions", {
        name: game.i18n.format("CTA.Permissions"),
        hint: game.i18n.format("CTA.Permissions_hint"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register(MODULE_NAME, "fadeOut", {
        name: game.i18n.format("CTA.FadeAnims"),
        hint: game.i18n.format("CTA.FadeAnims_hint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });
})

Hooks.on('init', CTA.ready);
Hooks.on('getSceneControlButtons', CTA.getSceneControlButtons)
